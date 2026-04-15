from __future__ import annotations

from datetime import datetime, timezone
import textwrap
from typing import Literal

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import crud
from app.db.models import Project, User
from app.schemas.report_schema import (
    ProjectAuditReportResponse,
    ReportRecentAlert,
    ReportRecentEvent,
    ReportSourceSummary,
)
from app.services.alert_service import alert_service
from app.services.monitoring_service import monitoring_service


class ReportService:
    async def get_project_audit_report(
        self,
        db_session: AsyncSession,
        *,
        user: User,
        project_id: str,
    ) -> ProjectAuditReportResponse:
        project: Project | None = await crud.get_project_for_user(
            db_session,
            project_id=project_id,
            user_id=str(user.id),
        )
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or inaccessible",
            )

        overview = await monitoring_service.get_project_overview(
            db_session,
            user=user,
            project_id=project_id,
        )
        event_list = await monitoring_service.list_events(
            db_session,
            user=user,
            project_id=project_id,
            limit=10,
        )
        alert_list = await alert_service.list_alerts(
            db_session,
            user=user,
            project_id=project_id,
            limit=10,
        )
        sources = await crud.list_sources_for_project(db_session, project_id)

        recent_events = [
            ReportRecentEvent(
                event_id=str(item.id),
                kind=item.kind,
                source_name=item.source_name,
                timestamp=item.timestamp,
                label=item.event_type or item.service or "Unnamed event",
                actor_id=item.actor_id,
                chain_hash=item.chain_hash,
            )
            for item in event_list.items[:5]
        ]

        recent_alerts = [
            ReportRecentAlert(
                alert_id=str(item.id),
                title=item.title,
                severity=item.severity,
                status=item.status,
                source_name=item.source_name,
                score=item.score,
                created_at=item.created_at,
            )
            for item in alert_list.items[:5]
        ]

        source_summaries = [
            ReportSourceSummary(
                source_id=str(source.id),
                source_name=source.name,
                source_type=source.type,
                status=source.status,
                api_key_prefix=source.api_key_prefix,
                last_key_rotated_at=source.last_key_rotated_at,
            )
            for source in sources
        ]

        summary = (
            f"Project {project.name} recorded {overview.total_events} total events with "
            f"{overview.total_alerts} alerts, including {overview.critical_alerts} critical alerts. "
            f"Integrity coverage is {overview.integrity_score_percent:.1f}% with "
            f"{overview.invalid_events} invalid events detected."
        )

        return ProjectAuditReportResponse(
            project_id=str(project.id),
            project_name=project.name,
            generated_at=datetime.now(timezone.utc),
            summary=summary,
            reporting_window="Latest available project evidence snapshot",
            total_events=overview.total_events,
            ai_events=overview.ai_events,
            system_events=overview.system_events,
            total_alerts=overview.total_alerts,
            open_alerts=overview.open_alerts,
            critical_alerts=overview.critical_alerts,
            verified_events=overview.verified_events,
            invalid_events=overview.invalid_events,
            integrity_score_percent=overview.integrity_score_percent,
            ready_sources=overview.ready_sources,
            connected_sources=overview.connected_sources,
            paused_sources=overview.paused_sources,
            source_count=overview.total_sources,
            source_summaries=source_summaries,
            recent_events=recent_events,
            recent_alerts=recent_alerts,
        )

    def build_project_audit_report_pdf(self, report: ProjectAuditReportResponse) -> bytes:
        lines = self._build_pdf_lines(report)
        return self._render_simple_pdf(lines)

    def _build_pdf_lines(self, report: ProjectAuditReportResponse) -> list[tuple[str, str]]:
        lines: list[tuple[str, str]] = []

        self._append_line(lines, "BlackLogix Compliance Report", style="title")
        self._append_line(lines, "Security audit snapshot for AI and system telemetry integrity.", style="subtitle")
        self._append_line(
            lines,
            f"Project: {report.project_name} | Generated: {report.generated_at.strftime('%Y-%m-%d %H:%M:%S %Z')} | Window: {report.reporting_window}",
            style="subtitle",
        )
        self._append_divider(lines)

        self._append_section(lines, "1. Executive Summary")
        self._append_body(lines, report.summary)
        self._append_body(
            lines,
            "This report explains the current operational posture of the selected project, including event coverage, alert posture, source readiness, and ledger integrity.",
        )

        self._append_section(lines, "2. Key Metrics")
        self._append_table(
            lines,
            headers=("Metric", "Value", "Metric", "Value"),
            rows=[
                ("Total events", str(report.total_events), "Integrity score", f"{report.integrity_score_percent:.1f}%"),
                ("AI events", str(report.ai_events), "System events", str(report.system_events)),
                ("Total alerts", str(report.total_alerts), "Open alerts", str(report.open_alerts)),
                ("Critical alerts", str(report.critical_alerts), "Invalid events", str(report.invalid_events)),
                ("Verified events", str(report.verified_events), "Sources", str(report.source_count)),
            ],
            widths=(20, 14, 20, 18),
        )

        self._append_section(lines, "3. Source Coverage")
        self._append_body(
            lines,
            "Sources identify which product stream or service produced the evidence. They also define the API key boundary used for ingestion and integrity verification.",
        )
        if report.source_summaries:
            self._append_table(
                lines,
                headers=("Source", "Type", "Status", "Key Prefix"),
                rows=[
                    (
                        source.source_name,
                        source.source_type,
                        source.status,
                        source.api_key_prefix or "N/A",
                    )
                    for source in report.source_summaries
                ],
                widths=(28, 16, 12, 18),
            )
        else:
            self._append_body(lines, "No sources are registered for this project yet.")

        self._append_section(lines, "4. Recent Alerts")
        self._append_body(
            lines,
            "Alerts are raised when the detection engine identifies risky content, suspicious event patterns, or integrity concerns that need analyst review.",
        )
        if report.recent_alerts:
            self._append_table(
                lines,
                headers=("Alert", "Severity", "Status", "Score"),
                rows=[
                    (
                        alert.title,
                        alert.severity,
                        alert.status,
                        f"{alert.score:.2f}",
                    )
                    for alert in report.recent_alerts
                ],
                widths=(42, 12, 14, 8),
            )
        else:
            self._append_body(lines, "No recent alerts were recorded in the current report window.")

        self._append_section(lines, "5. Recent Evidence")
        self._append_body(
            lines,
            "Recent evidence lists the latest AI or system events captured for the project and helps analysts validate who acted, what happened, and whether hash-chained evidence exists.",
        )
        if report.recent_events:
            self._append_table(
                lines,
                headers=("Label", "Kind", "Source", "Actor"),
                rows=[
                    (
                        event.label,
                        event.kind,
                        event.source_name,
                        event.actor_id or "Unknown",
                    )
                    for event in report.recent_events
                ],
                widths=(30, 10, 22, 18),
            )
            for event in report.recent_events:
                self._append_body(
                    lines,
                    f"Event detail: {event.label} at {event.timestamp.strftime('%Y-%m-%d %H:%M:%S %Z')} | Chain hash: {event.chain_hash or 'N/A'}",
                )
        else:
            self._append_body(lines, "No recent events were recorded in the current report window.")

        self._append_section(lines, "6. Conclusion")
        self._append_body(lines, self._build_conclusion(report))

        return lines

    def _render_simple_pdf(self, lines: list[tuple[str, str]]) -> bytes:
        page_width = 612
        page_height = 792
        margin_left = 50
        margin_top = 742
        bottom_margin = 55
        page_header = "BlackLogix Audit Report"
        styles = {
            "title": ("/F2", 18, 24),
            "subtitle": ("/F1", 10, 14),
            "section": ("/F2", 13, 18),
            "body": ("/F1", 10, 14),
            "table": ("/F3", 9, 12),
            "divider": ("/F1", 10, 12),
        }

        pages: list[list[tuple[str, str]]] = []
        current_page: list[tuple[str, str]] = []
        current_y = margin_top

        for line, style in lines:
            _, _, line_height = styles.get(style, styles["body"])
            if current_y - line_height < bottom_margin:
                pages.append(current_page)
                current_page = []
                current_y = margin_top
            current_page.append((line, style))
            current_y -= line_height

        if current_page or not pages:
            pages.append(current_page)

        objects: list[bytes] = []

        def add_object(payload: str | bytes) -> int:
            encoded = payload.encode("latin-1", errors="replace") if isinstance(payload, str) else payload
            objects.append(encoded)
            return len(objects)

        font_regular_obj = add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
        font_bold_obj = add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
        font_mono_obj = add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>")

        page_object_ids: list[int] = []
        content_object_ids: list[int] = []

        for page_number, page_lines in enumerate(pages, start=1):
            text_commands = ["BT"]
            current_y = margin_top

            text_commands.append(f"/F2 9 Tf")
            text_commands.append(f"{margin_left} {margin_top + 20} Td")
            text_commands.append(f"({self._escape_pdf_text(page_header)}) Tj")
            text_commands.append(f"{page_width - 110} 0 Td")
            text_commands.append(f"(Page {page_number}) Tj")
            text_commands.append(f"{-(page_width - 110)} -28 Td")

            for line, style in page_lines:
                font_name, font_size, line_height = styles.get(style, styles["body"])
                escaped_line = self._escape_pdf_text(line)
                text_commands.append(f"{font_name} {font_size} Tf")
                text_commands.append(f"1 0 0 1 {margin_left} {current_y} Tm")
                text_commands.append(f"({escaped_line}) Tj")
                current_y -= line_height
            text_commands.append("ET")
            stream = "\n".join(text_commands).encode("latin-1", errors="replace")
            content_obj = add_object(
                b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream"
            )
            content_object_ids.append(content_obj)
            page_obj = add_object(
                f"<< /Type /Page /Parent PAGES_REF /MediaBox [0 0 {page_width} {page_height}] "
                f"/Resources << /Font << /F1 {font_regular_obj} 0 R /F2 {font_bold_obj} 0 R /F3 {font_mono_obj} 0 R >> >> /Contents {content_obj} 0 R >>"
            )
            page_object_ids.append(page_obj)

        kids = " ".join(f"{page_id} 0 R" for page_id in page_object_ids)
        pages_obj = add_object(f"<< /Type /Pages /Kids [{kids}] /Count {len(page_object_ids)} >>")
        catalog_obj = add_object(f"<< /Type /Catalog /Pages {pages_obj} 0 R >>")

        rendered_objects: list[bytes] = []
        for index, obj in enumerate(objects, start=1):
            if b"PAGES_REF" in obj:
                obj = obj.replace(b"PAGES_REF", f"{pages_obj} 0 R".encode("ascii"))
            rendered_objects.append(f"{index} 0 obj\n".encode("ascii") + obj + b"\nendobj\n")

        pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = [0]
        for rendered in rendered_objects:
            offsets.append(len(pdf))
            pdf.extend(rendered)

        xref_offset = len(pdf)
        pdf.extend(f"xref\n0 {len(rendered_objects) + 1}\n".encode("ascii"))
        pdf.extend(b"0000000000 65535 f \n")
        for offset in offsets[1:]:
            pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))

        pdf.extend(
            (
                f"trailer\n<< /Size {len(rendered_objects) + 1} /Root {catalog_obj} 0 R >>\n"
                f"startxref\n{xref_offset}\n%%EOF"
            ).encode("ascii")
        )
        return bytes(pdf)

    def _escape_pdf_text(self, value: str) -> str:
        return (
            value.replace("\\", "\\\\")
            .replace("(", "\\(")
            .replace(")", "\\)")
        )

    def _append_line(
        self,
        lines: list[tuple[str, str]],
        value: str,
        *,
        style: Literal["title", "subtitle", "section", "body", "table", "divider"],
        width: int | None = None,
    ) -> None:
        if not value:
            lines.append(("", "body"))
            return

        wrap_width = width or {"title": 52, "subtitle": 90, "section": 80, "body": 92, "table": 92, "divider": 92}[style]
        wrapped = textwrap.wrap(value, width=wrap_width) or [""]
        for line in wrapped:
            lines.append((line, style))

    def _append_body(self, lines: list[tuple[str, str]], value: str) -> None:
        self._append_line(lines, value, style="body")
        lines.append(("", "body"))

    def _append_section(self, lines: list[tuple[str, str]], value: str) -> None:
        lines.append(("", "body"))
        self._append_line(lines, value, style="section")

    def _append_divider(self, lines: list[tuple[str, str]]) -> None:
        self._append_line(lines, "=" * 92, style="divider", width=92)
        lines.append(("", "body"))

    def _append_table(
        self,
        lines: list[tuple[str, str]],
        *,
        headers: tuple[str, ...],
        rows: list[tuple[str, ...]],
        widths: tuple[int, ...],
    ) -> None:
        header_row = self._format_table_row(headers, widths)
        divider_row = self._format_table_row(tuple("-" * max(width - 1, 1) for width in widths), widths)
        lines.append((header_row, "table"))
        lines.append((divider_row, "table"))
        for row in rows:
            lines.append((self._format_table_row(row, widths), "table"))
        lines.append(("", "body"))

    def _format_table_row(self, values: tuple[str, ...], widths: tuple[int, ...]) -> str:
        padded_values = []
        for value, width in zip(values, widths):
            normalized = self._truncate(value, width)
            padded_values.append(normalized.ljust(width))
        return " | ".join(padded_values)

    def _truncate(self, value: str, width: int) -> str:
        clean = (value or "").replace("\n", " ").strip()
        if len(clean) <= width:
            return clean
        if width <= 3:
            return clean[:width]
        return clean[: width - 3] + "..."

    def _build_conclusion(self, report: ProjectAuditReportResponse) -> str:
        if report.total_events == 0:
            return (
                "The project has not ingested enough evidence yet to support a meaningful security conclusion. "
                "The next step is to connect live sources and begin sending AI or system events so monitoring, integrity verification, and alerting can operate on real data."
            )

        if report.invalid_events > 0:
            return (
                f"The project currently needs integrity review because {report.invalid_events} invalid event records were detected. "
                "Analysts should verify the affected source chain, inspect recent evidence, and confirm whether the mismatch is due to tampering, legacy data, or ingestion gaps."
            )

        if report.critical_alerts > 0:
            return (
                f"The project is operationally active and integrity coverage is stable, but {report.critical_alerts} critical alerts require immediate analyst review. "
                "The recommended next action is to inspect the highest-severity alerts and replay the linked evidence."
            )

        if report.open_alerts > 0:
            return (
                f"The project currently has {report.open_alerts} open alerts with no integrity mismatch detected. "
                "The recommended next action is to review those alerts, validate the linked events, and close any false positives after investigation."
            )

        return (
            "The project currently shows stable integrity and no active alert pressure in this reporting window. "
            "The recommended next action is to keep sources connected, continue ingesting evidence, and periodically regenerate this report for audit review."
        )


report_service = ReportService()
