"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Copy,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  Server,
  ShieldCheck,
  X,
} from "lucide-react";

import { BoltStyleChat } from "@/components/ui/BoltStyleChat";
import SiteFooter from "@/components/ui/SiteFooter";
import SiteHeader from "@/components/ui/SiteHeader";
import {
  acknowledgeAlert,
  createChatSession,
  getAlertDetail,
  sendChatMessage,
  getEventDetail,
  createOrganization,
  createProject,
  createSource,
  getProjectAuditReport,
  getProjectOverview,
  listEvents,
  listAlerts,
  listOrganizations,
  listProjects,
  listSources,
  rotateSourceApiKey,
  resolveAlert,
  type AlertDetail,
  type AlertListItem,
  type EventDetail,
  type EventListItem,
  type IngestionSource,
  type Organization,
  type Project,
  type ProjectAuditReport,
  type ProjectOverview,
} from "@/lib/platform-api";

type SelectOption = { value: string; label: string };
type ChatViewMessage = { role: "user" | "assistant"; content: string };
type SourceKeyState = {
  sourceId: string;
  sourceName: string;
  plainApiKey: string;
};

function formatRelativeDate(value: string | null) {
  if (!value) {
    return "No events yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No events yet";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAlertTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatApiKeyTimestamp(value: string | null) {
  if (!value) {
    return "Not generated yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function titleCaseSeverity(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function titleCaseKind(value: string) {
  return value === "ai" ? "AI" : "System";
}

function findOptionLabel(options: SelectOption[], value: string, fallback = "Not selected") {
  return options.find((option) => option.value === value)?.label ?? fallback;
}

function toLatestSourceKey(source: IngestionSource): SourceKeyState | null {
  if (!source.plain_api_key) {
    return null;
  }

  return {
    sourceId: source.id,
    sourceName: source.name,
    plainApiKey: source.plain_api_key,
  };
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="theme-card-surface rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,#0b131b_0%,#080d13_100%)] p-5">
      <p className="theme-faint-text text-sm font-semibold uppercase tracking-[0.08em] text-zinc-500">
        {label}
      </p>
      <p className="theme-section-title mt-3 text-4xl font-bold tracking-[-0.04em] text-white">{value}</p>
      <p className="theme-section-copy mt-2 text-base text-zinc-400">{note}</p>
    </div>
  );
}

function TimelineChart() {
  return (
    <div className="theme-panel rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#0a1218_0%,#080c12_100%)] p-5">
      <div className="theme-gridline mb-4 flex items-center justify-between gap-4 border-b border-white/8 pb-4">
        <div>
          <h3 className="theme-section-title text-xl font-semibold text-white">
            Events per hour vs anomalies flagged
          </h3>
          <p className="theme-section-copy mt-1 text-base text-zinc-400">
            Review ingestion volume alongside AI-detected anomalies.
          </p>
        </div>
        <Activity className="h-5 w-5 text-sky-300" />
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="relative h-[260px] min-w-[620px]">
          {[0, 1, 2, 3, 4].map((line) => (
            <div
              key={line}
              className="theme-gridline absolute left-0 right-0 border-t border-white/6"
              style={{ top: `${(line / 4) * 100}%` }}
            />
          ))}
          <svg viewBox="0 0 620 260" className="h-full w-full">
            {[90, 110, 130, 160, 145, 170, 188, 160, 150, 175, 194, 210].map((value, index) => (
              <rect
                key={`${value}-${index}`}
                x={index * 48 + 20}
                y={250 - value}
                width="28"
                height={value}
                rx="4"
                fill="#1ad7ff"
                opacity={0.85}
              />
            ))}

            <polyline
              points="34,186 82,180 130,162 178,150 226,126 274,142 322,118 370,126 418,112 466,88 514,100 562,76"
              fill="none"
              stroke="#f59ac2"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="theme-faint-text mt-3 grid min-w-[620px] grid-cols-6 text-center text-xs text-zinc-500">
            {["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="theme-input-label mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="theme-input-field w-full rounded-xl border border-white/10 bg-[#0a1016] px-4 py-3 text-base text-white focus:outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="theme-input-label mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="theme-input-field w-full rounded-xl border border-white/10 bg-[#0a1016] px-4 py-3 text-base text-white focus:outline-none"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function EntityList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <details className="theme-item-surface rounded-[18px] border border-white/8 bg-[#091017] p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div>
          <p className="theme-faint-text text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
            {title}
          </p>
          <p className="theme-section-copy mt-1 text-sm text-zinc-400">
            {items.length > 0 ? `${items.length} saved` : emptyLabel}
          </p>
        </div>
        <ChevronRight size={16} className="text-zinc-400 transition-transform group-open:rotate-90" />
      </summary>
      <div className="mt-3 space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item}
              className="theme-surface-muted rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-base text-zinc-300"
            >
              {item}
            </div>
          ))
        ) : (
          <p className="theme-section-copy text-base text-zinc-400">{emptyLabel}</p>
        )}
      </div>
    </details>
  );
}

function WorkspaceCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="theme-item-surface rounded-[20px] border border-white/8 bg-[#091017] p-4">
      <div className="theme-gridline border-b border-white/8 pb-3">
        <h4 className="theme-section-title text-lg font-semibold text-white">{title}</h4>
        <p className="theme-section-copy mt-1 text-base text-zinc-400">{subtitle}</p>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

export default function AnalystDashboardPage() {
  const [setupMode, setSetupMode] = React.useState<IngestionSource["type"]>("ai_application");
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [sources, setSources] = React.useState<IngestionSource[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = React.useState("");
  const [selectedProjectId, setSelectedProjectId] = React.useState("");
  const [selectedSourceId, setSelectedSourceId] = React.useState("");
  const [latestSourceKey, setLatestSourceKey] = React.useState<SourceKeyState | null>(null);
  const [organizationName, setOrganizationName] = React.useState("");
  const [projectName, setProjectName] = React.useState("");
  const [sourceName, setSourceName] = React.useState("");
  const [statusValue, setStatusValue] = React.useState<IngestionSource["status"]>("ready");
  const [overview, setOverview] = React.useState<ProjectOverview | null>(null);
  const [alerts, setAlerts] = React.useState<AlertListItem[]>([]);
  const [selectedAlert, setSelectedAlert] = React.useState<AlertDetail | null>(null);
  const [events, setEvents] = React.useState<EventListItem[]>([]);
  const [selectedEvent, setSelectedEvent] = React.useState<EventDetail | null>(null);
  const [auditReport, setAuditReport] = React.useState<ProjectAuditReport | null>(null);
  const [chatMessages, setChatMessages] = React.useState<ChatViewMessage[]>([]);
  const [chatSessionId, setChatSessionId] = React.useState<string | null>(null);
  const [chatSending, setChatSending] = React.useState(false);
  const [chatError, setChatError] = React.useState<string | null>(null);
  const [eventKindFilter, setEventKindFilter] = React.useState<"all" | EventListItem["kind"]>("all");
  const [loading, setLoading] = React.useState(true);
  const [overviewLoading, setOverviewLoading] = React.useState(false);
  const [alertsLoading, setAlertsLoading] = React.useState(false);
  const [eventsLoading, setEventsLoading] = React.useState(false);
  const [auditReportLoading, setAuditReportLoading] = React.useState(false);
  const [alertActionLoading, setAlertActionLoading] = React.useState<"acknowledge" | "resolve" | null>(null);
  const [sourceKeyActionLoading, setSourceKeyActionLoading] = React.useState(false);
  const [submittingAction, setSubmittingAction] = React.useState<"organization" | "project" | "source" | null>(null);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("");

  const organizationOptions = React.useMemo(
    () => organizations.map((organization) => ({ value: organization.id, label: organization.name })),
    [organizations],
  );

  const projectsForSelectedOrganization = React.useMemo(
    () => projects.filter((project) => project.organization_id === selectedOrganizationId),
    [projects, selectedOrganizationId],
  );

  const projectOptions = React.useMemo(
    () => projectsForSelectedOrganization.map((project) => ({ value: project.id, label: project.name })),
    [projectsForSelectedOrganization],
  );

  const projectSources = React.useMemo(
    () => sources.filter((source) => source.project_id === selectedProjectId),
    [sources, selectedProjectId],
  );

  const sourceOptions = React.useMemo(
    () =>
      projectSources.map((source) => ({
        value: source.id,
        label: `${source.name} (${source.type})`,
      })),
    [projectSources],
  );

  const selectedSource = React.useMemo(
    () => projectSources.find((source) => source.id === selectedSourceId) ?? null,
    [projectSources, selectedSourceId],
  );

  const selectedOrganizationName = React.useMemo(
    () => findOptionLabel(organizationOptions, selectedOrganizationId),
    [organizationOptions, selectedOrganizationId],
  );

  const selectedProjectName = React.useMemo(
    () => findOptionLabel(projectOptions, selectedProjectId),
    [projectOptions, selectedProjectId],
  );

  const chatContextKey = React.useMemo(
    () => [selectedProjectId || "none", selectedAlert?.id || "no-alert", selectedEvent?.id || "no-event"].join(":"),
    [selectedAlert?.id, selectedEvent?.id, selectedProjectId],
  );

  const metrics = React.useMemo(() => {
    if (!overview) {
      return [
        {
          label: "Total Events",
          value: "0",
          note: "Create a project and source to begin collecting evidence.",
        },
        {
          label: "Open Alerts",
          value: "0",
          note: "Risk detections will appear here after event ingestion.",
        },
        {
          label: "Integrity Score",
          value: "100%",
          note: "Fresh projects begin with clean integrity coverage.",
        },
      ];
    }

    return [
      {
        label: "Total Events",
        value: overview.total_events.toLocaleString(),
        note: `${overview.ai_events.toLocaleString()} AI events and ${overview.system_events.toLocaleString()} system events`,
      },
      {
        label: "Open Alerts",
        value: overview.open_alerts.toLocaleString(),
        note: `${overview.critical_alerts.toLocaleString()} critical across ${overview.total_alerts.toLocaleString()} total alerts`,
      },
      {
        label: "Integrity Score",
        value: `${overview.integrity_score_percent.toFixed(1)}%`,
        note: `${overview.verified_events.toLocaleString()} verified, ${overview.invalid_events.toLocaleString()} invalid`,
      },
    ];
  }, [overview]);

  const loadProjectSignals = React.useCallback(
    async ({
      preferredAlertId,
      preferredEventId,
    }: {
      preferredAlertId?: string | null;
      preferredEventId?: string | null;
    } = {}) => {
      if (!selectedProjectId) {
        setOverview(null);
        setAlerts([]);
        setSelectedAlert(null);
        setEvents([]);
        setSelectedEvent(null);
        return;
      }

      const [overviewResponse, alertResponse, eventResponse] = await Promise.all([
        getProjectOverview(selectedProjectId),
        listAlerts({ projectId: selectedProjectId, limit: 20 }),
        listEvents({
          projectId: selectedProjectId,
          sourceId: selectedSourceId || undefined,
          kind: eventKindFilter === "all" ? undefined : eventKindFilter,
          limit: 20,
        }),
      ]);

      setOverview(overviewResponse);
      setAlerts(alertResponse.items);
      setEvents(eventResponse.items);

      const resolvedAlertId =
        preferredAlertId && alertResponse.items.some((item) => item.id === preferredAlertId)
          ? preferredAlertId
          : alertResponse.items[0]?.id ?? null;

      if (resolvedAlertId) {
        try {
          const detail = await getAlertDetail(resolvedAlertId);
          setSelectedAlert(detail);
        } catch {
          setSelectedAlert(null);
        }
      } else {
        setSelectedAlert(null);
      }

      const resolvedEventId =
        preferredEventId && eventResponse.items.some((item) => item.id === preferredEventId)
          ? preferredEventId
          : eventResponse.items[0]?.id ?? null;

      if (resolvedEventId) {
        try {
          const detail = await getEventDetail(resolvedEventId);
          setSelectedEvent(detail);
        } catch {
          setSelectedEvent(null);
        }
      } else {
        setSelectedEvent(null);
      }
    },
    [eventKindFilter, selectedProjectId, selectedSourceId],
  );

  const loadWorkspace = React.useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [organizationItems, projectItems, sourceItems] = await Promise.all([
        listOrganizations(),
        listProjects(),
        listSources(),
      ]);

      setOrganizations(organizationItems);
      setProjects(projectItems);
      setSources(sourceItems);

      setSelectedOrganizationId((current) => {
        if (current && organizationItems.some((organization) => organization.id === current)) {
          return current;
        }
        return organizationItems[0]?.id ?? "";
      });
    } catch (error) {
      showError("Unable to load workspace", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  React.useEffect(() => {
    if (!selectedOrganizationId) {
      setSelectedProjectId("");
      return;
    }

    if (
      selectedProjectId &&
      projectsForSelectedOrganization.some((project) => project.id === selectedProjectId)
    ) {
      return;
    }

    setSelectedProjectId(projectsForSelectedOrganization[0]?.id ?? "");
  }, [projectsForSelectedOrganization, selectedOrganizationId, selectedProjectId]);

  React.useEffect(() => {
    if (!selectedProjectId) {
      setSelectedSourceId("");
      return;
    }

    if (selectedSourceId && projectSources.some((source) => source.id === selectedSourceId)) {
      return;
    }

    setSelectedSourceId(projectSources[0]?.id ?? "");
  }, [projectSources, selectedProjectId, selectedSourceId]);

  React.useEffect(() => {
    if (!selectedProjectId) {
      setOverview(null);
      setAlerts([]);
      setSelectedAlert(null);
      setEvents([]);
      setSelectedEvent(null);
      setAuditReport(null);
      setChatMessages([]);
      setChatSessionId(null);
      setChatError(null);
      return;
    }

    let isActive = true;
    setOverviewLoading(true);
    setAlertsLoading(true);
    setEventsLoading(true);

    void loadProjectSignals({
      preferredAlertId: selectedAlert?.id ?? null,
      preferredEventId:
        selectedAlert?.event_id ??
        selectedEvent?.id ??
        null,
    })
      .then(() => {
        if (!isActive) {
          return;
        }
        setAuditReport(null);
      })
      .catch((error) => {
        if (isActive) {
          setOverview(null);
          setAlerts([]);
          setSelectedAlert(null);
          setEvents([]);
          setSelectedEvent(null);
          setErrorMessage(error instanceof Error ? error.message : "Unable to load overview");
        }
      })
      .finally(() => {
        if (isActive) {
          setOverviewLoading(false);
          setAlertsLoading(false);
          setEventsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [eventKindFilter, loadProjectSignals, selectedAlert?.event_id, selectedAlert?.id, selectedEvent?.id, selectedProjectId]);

  React.useEffect(() => {
    setChatMessages([]);
    setChatSessionId(null);
    setChatError(null);
  }, [chatContextKey]);

  const clearMessages = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  const showError = (fallback: string, error: unknown) => {
    setErrorMessage(error instanceof Error ? error.message : fallback);
  };

  React.useEffect(() => {
    if (!errorMessage && !successMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      clearMessages();
    }, 6000);

    return () => window.clearTimeout(timeoutId);
  }, [errorMessage, successMessage]);

  const handleCreateOrganization = async () => {
    const trimmedName = organizationName.trim();
    if (!trimmedName) {
      setErrorMessage("Enter an organization name first.");
      return;
    }

    clearMessages();
    setSubmittingAction("organization");

    try {
      const organization = await createOrganization(trimmedName);
      const nextOrganizations = [organization, ...organizations];
      setOrganizations(nextOrganizations);
      setSelectedOrganizationId(organization.id);
      setOrganizationName("");
      setSuccessMessage("Organization created successfully.");
    } catch (error) {
      showError("Unable to create organization", error);
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleCreateProject = async () => {
    const trimmedName = projectName.trim();
    if (!selectedOrganizationId) {
      setErrorMessage("Create or select an organization first.");
      return;
    }

    if (!trimmedName) {
      setErrorMessage("Enter a project name first.");
      return;
    }

    clearMessages();
    setSubmittingAction("project");

    try {
      const project = await createProject(selectedOrganizationId, trimmedName);
      const nextProjects = [project, ...projects];
      setProjects(nextProjects);
      setSelectedProjectId(project.id);
      setProjectName("");
      setSuccessMessage("Project created successfully.");
    } catch (error) {
      showError("Unable to create project", error);
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleCreateSource = async () => {
    const trimmedName = sourceName.trim();
    if (!selectedProjectId) {
      setErrorMessage("Create or select a project first.");
      return;
    }

    if (!trimmedName) {
      setErrorMessage("Enter a source name first.");
      return;
    }

    clearMessages();
    setSubmittingAction("source");

    try {
      const source = await createSource({
        projectId: selectedProjectId,
        type: setupMode,
        name: trimmedName,
        status: statusValue,
      });

      setSources((current) => [source, ...current]);
      setSelectedSourceId(source.id);
      setLatestSourceKey(toLatestSourceKey(source));
      setSourceName("");
      setSuccessMessage(
        `${setupMode === "ai_application" ? "AI application" : "System logs"} source created successfully. Save the API key shown below before closing it.`,
      );

      const nextOverview = await getProjectOverview(selectedProjectId);
      setOverview(nextOverview);
    } catch (error) {
      showError("Unable to create source", error);
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleSelectAlert = async (alertId: string) => {
    setErrorMessage("");
    try {
      const detail = await getAlertDetail(alertId);
      setSelectedAlert(detail);
      if (detail.event_id) {
        const eventDetail = await getEventDetail(detail.event_id);
        setSelectedEvent(eventDetail);
      }
    } catch (error) {
      showError("Unable to load alert detail", error);
    }
  };

  const refreshProjectSignals = React.useCallback(async () => {
    if (!selectedProjectId) {
      return;
    }

    setOverviewLoading(true);
    setAlertsLoading(true);
    setEventsLoading(true);

    try {
      await loadProjectSignals({
        preferredAlertId: selectedAlert?.id ?? null,
        preferredEventId: selectedEvent?.id ?? null,
      });
    } catch (error) {
      showError("Unable to refresh project data", error);
    } finally {
      setOverviewLoading(false);
      setAlertsLoading(false);
      setEventsLoading(false);
    }
  }, [loadProjectSignals, selectedAlert?.id, selectedEvent?.id, selectedProjectId]);

  const handleAlertStatusUpdate = async (action: "acknowledge" | "resolve") => {
    if (!selectedAlert) {
      return;
    }

    clearMessages();
    setAlertActionLoading(action);

    try {
      const updated =
        action === "acknowledge"
          ? await acknowledgeAlert(selectedAlert.id)
          : await resolveAlert(selectedAlert.id);

      setSelectedAlert(updated);
      setSuccessMessage(
        action === "acknowledge" ? "Alert acknowledged successfully." : "Alert resolved successfully.",
      );
      await refreshProjectSignals();
    } catch (error) {
      showError("Unable to update alert", error);
    } finally {
      setAlertActionLoading(null);
    }
  };

  const handleSelectEvent = async (eventId: string) => {
    setErrorMessage("");
    try {
      const detail = await getEventDetail(eventId);
      setSelectedEvent(detail);
    } catch (error) {
      showError("Unable to load event detail", error);
    }
  };

  const handleRotateSourceKey = async () => {
    if (!selectedSourceId) {
      setErrorMessage("Select a source first.");
      return;
    }

    clearMessages();
    setSourceKeyActionLoading(true);

    try {
      const rotatedSource = await rotateSourceApiKey(selectedSourceId);
      setSources((current) =>
        current.map((source) => (source.id === rotatedSource.id ? rotatedSource : source)),
      );
      setLatestSourceKey(toLatestSourceKey(rotatedSource));
      setSuccessMessage("Source API key rotated successfully. Copy the new key before closing it.");
    } catch (error) {
      showError("Unable to rotate source API key", error);
    } finally {
      setSourceKeyActionLoading(false);
    }
  };

  const handleCopyLatestSourceKey = async () => {
    if (!latestSourceKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(latestSourceKey.plainApiKey);
      setSuccessMessage("Source API key copied to clipboard.");
    } catch {
      setErrorMessage("Unable to copy the source API key automatically.");
    }
  };

  const handleGenerateAuditReport = async () => {
    if (!selectedProjectId) {
      setErrorMessage("Select a project first.");
      return;
    }

    clearMessages();
    setAuditReportLoading(true);

    try {
      const report = await getProjectAuditReport(selectedProjectId);
      setAuditReport(report);
      setSuccessMessage("Compliance report generated successfully.");
    } catch (error) {
      showError("Unable to generate compliance report", error);
    } finally {
      setAuditReportLoading(false);
    }
  };

  const handleCopyAuditReport = async () => {
    if (!auditReport) {
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(auditReport, null, 2));
      setSuccessMessage("Compliance report copied to clipboard.");
    } catch {
      setErrorMessage("Unable to copy the compliance report automatically.");
    }
  };

  const ensureContextualChatSession = React.useCallback(async () => {
    if (chatSessionId) {
      return chatSessionId;
    }

    const titleParts = [
      selectedProjectId ? projectOptions.find((project) => project.value === selectedProjectId)?.label ?? "Project investigation" : "Investigation",
      selectedAlert ? "alert review" : null,
      selectedEvent ? "event replay" : null,
    ].filter(Boolean);

      const session = await createChatSession({
        title: titleParts.join(" · ") || "Investigation chat",
        projectId: selectedProjectId || undefined,
      alertId: selectedAlert?.id || undefined,
      eventId: selectedEvent?.id || undefined,
    });
    setChatSessionId(session.id);
    return session.id;
  }, [chatSessionId, projectOptions, selectedAlert, selectedEvent, selectedProjectId]);

  const handleAnalystChatSend = React.useCallback(
    async (message: string) => {
      const trimmedMessage = message.trim();
      if (!trimmedMessage) {
        return;
      }

      setChatError(null);
      setChatMessages((current) => [...current, { role: "user", content: trimmedMessage }]);
      setChatSending(true);

      try {
        const sessionId = await ensureContextualChatSession();
        const response = await sendChatMessage({
          sessionId,
          message: trimmedMessage,
        });

        setChatMessages((current) => [
          ...current,
          { role: "assistant", content: response.assistant_message.content },
        ]);
      } catch (error) {
        setChatMessages((current) => current.slice(0, -1));
        setChatError(
          error instanceof Error ? error.message : "Unable to get a contextual response from the analyst chat.",
        );
      } finally {
        setChatSending(false);
      }
    },
    [ensureContextualChatSession],
  );

  const handleContextQuickPrompt = React.useCallback(() => {
    const promptParts = [
      "Summarize the current investigation context.",
      selectedAlert ? "Explain why the selected alert was raised and what evidence supports it." : null,
      selectedEvent ? "Break down the selected event, its integrity chain, and the most important metadata." : null,
      selectedProjectId ? "Recommend the next analyst action for this project." : null,
    ].filter(Boolean);
    void handleAnalystChatSend(promptParts.join(" "));
  }, [handleAnalystChatSend, selectedAlert, selectedEvent, selectedProjectId]);

  return (
    <div className="theme-page min-h-screen bg-[#030507] text-white">
      <SiteHeader />
      <div className="px-4 pb-8 pt-24 sm:px-5 md:px-8 md:pt-28">
        <div className="mx-auto max-w-[1500px]">
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                <CheckCircle2 size={14} />
                Analyst Dashboard
              </div>
              <h1 className="theme-page-title mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                Live security analytics and workspace setup
              </h1>
              <p className="theme-page-copy mt-3 max-w-3xl text-base leading-7 text-zinc-400">
                Create your organization, open a project, and register AI application or system
                log sources from the dashboard before moving into ingestion and monitoring.
              </p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 md:w-auto">
              <button
                type="button"
                onClick={() => setSetupMode("ai_application")}
                className={`rounded-full px-4 py-3 text-base font-medium transition-colors sm:min-w-[190px] ${
                  setupMode === "ai_application"
                    ? "theme-primary-button bg-white text-black"
                    : "theme-muted-button border border-white/10 bg-white/[0.03] text-zinc-300"
                }`}
              >
                AI Application Source
              </button>
              <button
                type="button"
                onClick={() => setSetupMode("system_logs")}
                className={`rounded-full px-4 py-3 text-base font-medium transition-colors sm:min-w-[190px] ${
                  setupMode === "system_logs"
                    ? "theme-primary-button bg-white text-black"
                    : "theme-muted-button border border-white/10 bg-white/[0.03] text-zinc-300"
                }`}
              >
                System Logs Source
              </button>
            </div>

          </div>

          <div className="mt-6">
            <div className="theme-panel relative rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#0a1218_0%,#080c12_100%)] p-5">
              <div className="theme-gridline mb-4 flex items-center justify-between border-b border-white/8 pb-4">
                <div>
                  <h3 className="theme-section-title text-xl font-semibold text-white">
                    Workspace onboarding
                  </h3>
                  <p className="theme-section-copy mt-1 text-base text-zinc-400">
                    These objects are stored in FastAPI and PostgreSQL, so they are ready for the
                    next ingestion and integrity steps.
                  </p>
                </div>
                {loading ? <LoaderCircle className="h-5 w-5 animate-spin text-sky-300" /> : <ShieldCheck className="h-5 w-5 text-sky-300" />}
              </div>

              <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                <WorkspaceCard
                  title="Organization"
                  subtitle="Choose an existing organization from the dropdown, or create a new one below."
                >
                  <SelectField
                    label="Existing Organization"
                    value={selectedOrganizationId}
                    onChange={setSelectedOrganizationId}
                    options={organizationOptions}
                    placeholder="Choose an organization"
                  />
                  <Field
                    label="New Organization Name"
                    value={organizationName}
                    onChange={setOrganizationName}
                    placeholder="SmartSupport AI"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateOrganization()}
                    disabled={submittingAction === "organization"}
                    className="theme-primary-button inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-base font-semibold text-black transition-colors hover:bg-zinc-200"
                  >
                    {submittingAction === "organization" ? <LoaderCircle size={16} className="animate-spin" /> : null}
                    Create organization
                  </button>
                  <EntityList
                    title="Saved organizations"
                    items={organizations.map((organization) => organization.name)}
                    emptyLabel="No organizations yet."
                  />
                </WorkspaceCard>

                <WorkspaceCard
                  title="Project"
                  subtitle="Projects depend on the selected organization. Pick an existing project or create a new one."
                >
                  <SelectField
                    label="Existing Project"
                    value={selectedProjectId}
                    onChange={setSelectedProjectId}
                    options={projectOptions}
                    placeholder="Choose a project"
                  />
                  <Field
                    label="New Project Name"
                    value={projectName}
                    onChange={setProjectName}
                    placeholder="Customer Support Bot"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateProject()}
                    disabled={submittingAction === "project"}
                    className="theme-primary-button inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-base font-semibold text-black transition-colors hover:bg-zinc-200"
                  >
                    {submittingAction === "project" ? <LoaderCircle size={16} className="animate-spin" /> : null}
                    Create project
                  </button>
                  <EntityList
                    title="Saved projects"
                    items={projectsForSelectedOrganization.map((project) => project.name)}
                    emptyLabel="No projects in this organization yet."
                  />
                </WorkspaceCard>

                <WorkspaceCard
                  title={setupMode === "ai_application" ? "AI Application Source" : "System Logs Source"}
                  subtitle="Choose an existing source from the selected project, or create a new source below."
                >
                  <SelectField
                    label="Existing Source"
                    value={selectedSourceId}
                    onChange={setSelectedSourceId}
                    options={sourceOptions}
                    placeholder="Choose a source"
                  />
                  <Field
                    label="New Source Name"
                    value={sourceName}
                    onChange={setSourceName}
                    placeholder={setupMode === "ai_application" ? "GPT Support Pipeline" : "Auth Service Logs"}
                  />
                  <SelectField
                    label="Status"
                    value={statusValue}
                    onChange={(value) => setStatusValue(value as IngestionSource["status"])}
                    options={[
                      { value: "ready", label: "Ready" },
                      { value: "connected", label: "Connected" },
                      { value: "paused", label: "Paused" },
                    ]}
                    placeholder="Choose a status"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateSource()}
                    disabled={submittingAction === "source"}
                    className="theme-primary-button inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-base font-semibold text-black transition-colors hover:bg-zinc-200"
                  >
                    {submittingAction === "source" ? <LoaderCircle size={16} className="animate-spin" /> : null}
                    Save source
                    <ChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadWorkspace()}
                    disabled={loading}
                    className="theme-muted-button inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-base font-semibold text-zinc-200 transition-colors hover:bg-white/[0.06]"
                  >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Refresh workspace
                  </button>
                  <EntityList
                    title="Saved sources"
                    items={projectSources.map((source) => `${source.name} · ${source.type}`)}
                    emptyLabel="No sources in this project yet."
                  />
                  {latestSourceKey ? (
                    <div className="rounded-[18px] border border-emerald-500/20 bg-emerald-500/8 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-300">
                            Ingestion API Key
                          </p>
                          <p className="mt-1 text-base text-zinc-200">
                            Save this key for <span className="font-semibold text-white">{latestSourceKey.sourceName}</span>. It is only shown in full right after creation or rotation.
                          </p>
                        </div>
                        <KeyRound className="mt-1 h-5 w-5 text-emerald-300" />
                      </div>
                      <div className="mt-3 rounded-xl border border-white/8 bg-[#091017] px-3 py-3 font-mono text-sm text-emerald-200">
                        {latestSourceKey.plainApiKey}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => void handleCopyLatestSourceKey()}
                          className="theme-primary-button inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
                        >
                          <Copy size={14} />
                          Copy key
                        </button>
                        <button
                          type="button"
                          onClick={() => setLatestSourceKey(null)}
                          className="theme-muted-button inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/[0.06]"
                        >
                          Hide key
                        </button>
                      </div>
                    </div>
                  ) : null}
                </WorkspaceCard>
              </div>

              {(errorMessage || successMessage) ? (
                <div className="pointer-events-none absolute right-4 top-4 z-20 max-w-sm">
                  <div
                    className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur ${
                      errorMessage
                        ? "border-rose-200 bg-rose-50 text-rose-900"
                        : "border-emerald-200 bg-emerald-50 text-emerald-900"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold uppercase tracking-[0.08em]">
                          {errorMessage ? "Action failed" : "Saved successfully"}
                        </p>
                        <p className="mt-1 text-base leading-6">{errorMessage || successMessage}</p>
                      </div>
                      <button
                        type="button"
                        onClick={clearMessages}
                        className="rounded-full p-1 text-current/70 transition-colors hover:bg-black/5 hover:text-current"
                        aria-label="Close message"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 text-base text-zinc-400">
            {overviewLoading ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} className="text-emerald-300" />}
            <span>
              {selectedProjectId
                ? `Overview for this project was checked ${overview ? formatRelativeDate(overview.checked_at) : "just now"}. Latest event: ${formatRelativeDate(overview?.latest_event_at ?? null)}.`
                : "Select a project to load live overview metrics from the backend."}
            </span>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <TimelineChart />

            <div className="theme-panel rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#0a1218_0%,#080c12_100%)] p-5">
              <div className="theme-gridline mb-4 flex items-center justify-between border-b border-white/8 pb-4">
                <div>
                  <h3 className="theme-section-title text-lg font-semibold text-white">
                    Current project status
                  </h3>
                  <p className="theme-section-copy mt-1 text-base text-zinc-400">
                    A quick view of the selected workspace object chain before live alerting is wired in.
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 text-sky-300" />
              </div>

              <div className="grid gap-3">
                <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] px-4 py-3">
                  <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    Organization
                  </p>
                  <p className="theme-section-title mt-1 text-base font-semibold text-white">
                    {selectedOrganizationName}
                  </p>
                </div>
                <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] px-4 py-3">
                  <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    Project
                  </p>
                  <p className="theme-section-title mt-1 text-base font-semibold text-white">
                    {selectedProjectName}
                  </p>
                </div>
                <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] px-4 py-3">
                  <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    Registered Sources
                  </p>
                  <p className="theme-section-title mt-1 text-base font-semibold text-white">
                    {projectSources.length > 0 ? `${projectSources.length} source${projectSources.length === 1 ? "" : "s"}` : "No sources yet"}
                  </p>
                  <p className="theme-section-copy mt-1 text-base text-zinc-400">
                    {projectSources.length > 0
                      ? projectSources.map((source) => source.name).join(", ")
                      : "Create an AI application source or system logs source to continue."}
                  </p>
                </div>
                <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] px-4 py-3">
                  <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    Selected Source
                  </p>
                  <p className="theme-section-title mt-1 text-base font-semibold text-white">
                    {selectedSource?.name ?? "Not selected"}
                  </p>
                  <p className="theme-section-copy mt-1 text-base text-zinc-400">
                    {selectedSource
                      ? `${selectedSource.type} · ${selectedSource.status}`
                      : "Choose an existing source from the selector above."}
                  </p>
                  {selectedSource ? (
                    <div className="mt-3 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-sm text-zinc-400">API key prefix</p>
                          <p className="text-base font-semibold text-white">
                            {selectedSource.api_key_prefix ?? "No key issued"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-zinc-400">Last rotated</p>
                          <p className="text-base font-semibold text-white">
                            {formatApiKeyTimestamp(selectedSource.last_key_rotated_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => void handleRotateSourceKey()}
                          disabled={sourceKeyActionLoading}
                          className="theme-muted-button inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {sourceKeyActionLoading ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                          Rotate API key
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] px-4 py-3">
                  <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    Alert posture
                  </p>
                  <p className="theme-section-title mt-1 text-base font-semibold text-white">
                    {overview ? `${overview.open_alerts} open / ${overview.critical_alerts} critical` : "No alert data yet"}
                  </p>
                  <p className="theme-section-copy mt-1 text-base text-zinc-400">
                    {overview
                      ? `${overview.total_alerts} total alerts recorded for this project.`
                      : "Once risky events are ingested, alerts will appear here."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="theme-panel rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#0a1218_0%,#080c12_100%)] p-5">
              <div className="theme-gridline mb-4 flex items-center justify-between border-b border-white/8 pb-4">
                <div>
                  <h3 className="theme-section-title text-lg font-semibold text-white">
                    Event explorer
                  </h3>
                  <p className="theme-section-copy mt-1 text-base text-zinc-400">
                    Browse real ingested events for the selected project and source.
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
              </div>

              <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                <div className="space-y-4">
                  <SelectField
                    label="Event Kind"
                    value={eventKindFilter}
                    onChange={(value) => setEventKindFilter(value as "all" | EventListItem["kind"])}
                    options={[
                      { value: "all", label: "All events" },
                      { value: "ai", label: "AI events" },
                      { value: "system", label: "System events" },
                    ]}
                    placeholder="Choose kind"
                  />
                  <div className="theme-input-surface rounded-[18px] border border-sky-500/15 bg-sky-500/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sky-300">
                      Explorer scope
                    </p>
                    <p className="theme-section-copy mt-2 text-base text-zinc-300">
                      {selectedProjectId
                        ? `${selectedProjectName} · ${selectedSource?.name ?? "All sources"}`
                        : "Select a project first to load event evidence."}
                    </p>
                  </div>
                </div>

                <div className="theme-card-surface overflow-hidden rounded-[20px] border border-white/8 bg-[#091017]">
                  <div className="hidden grid-cols-[90px_120px_1fr_1.1fr] gap-3 border-b border-white/8 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 md:grid">
                    <span>Kind</span>
                    <span>Time</span>
                    <span>Source</span>
                    <span>Type</span>
                  </div>

                  {eventsLoading ? (
                    <div className="flex items-center justify-center gap-3 px-4 py-8 text-base text-zinc-400">
                      <LoaderCircle size={18} className="animate-spin" />
                      Loading events...
                    </div>
                  ) : events.length > 0 ? (
                    events.map((event, index) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => void handleSelectEvent(event.id)}
                        className={`block w-full px-4 py-4 text-left transition-colors hover:bg-white/[0.03] ${
                          index < events.length - 1 ? "theme-gridline border-b border-white/6" : ""
                        } ${selectedEvent?.id === event.id ? "bg-white/[0.04]" : ""}`}
                      >
                        <div className="hidden grid-cols-[90px_120px_1fr_1.1fr] gap-3 text-sm md:grid">
                          <span className="rounded-full bg-sky-500/10 px-3 py-1 text-center font-semibold text-sky-300">
                            {titleCaseKind(event.kind)}
                          </span>
                          <span className="theme-section-copy text-sm text-zinc-400">
                            {formatAlertTimestamp(event.timestamp)}
                          </span>
                          <span className="theme-section-title text-base font-medium text-white">{event.source_name}</span>
                          <span className="theme-section-copy text-sm text-zinc-300">
                            {event.event_type ?? event.service ?? "Unnamed event"}
                          </span>
                        </div>

                        <div className="space-y-3 md:hidden">
                          <div className="flex items-start justify-between gap-3">
                            <span className="rounded-full bg-sky-500/10 px-3 py-1 text-center text-xs font-semibold text-sky-300">
                              {titleCaseKind(event.kind)}
                            </span>
                            <span className="theme-section-copy text-base text-zinc-400">
                              {formatAlertTimestamp(event.timestamp)}
                            </span>
                          </div>
                          <div>
                            <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                              Source
                            </p>
                            <p className="theme-section-title mt-1 text-base font-medium text-white">{event.source_name}</p>
                          </div>
                          <div>
                            <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                              Type
                            </p>
                            <p className="theme-section-copy mt-1 text-base text-zinc-300">
                              {event.event_type ?? event.service ?? "Unnamed event"}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-base text-zinc-400">
                      No events yet. Ingest AI or system events to populate the explorer.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="theme-panel rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#0a1218_0%,#080c12_100%)] p-5">
              <div className="theme-gridline mb-4 flex items-center justify-between border-b border-white/8 pb-4">
                <div>
                  <h3 className="theme-section-title text-lg font-semibold text-white">
                    Open alerts
                  </h3>
                  <p className="theme-section-copy mt-1 text-base text-zinc-400">
                    Live alert queue from the FastAPI detection engine with severity, source, and score.
                  </p>
                </div>
                <AlertTriangle className="h-5 w-5 text-rose-300" />
              </div>

              <div className="theme-card-surface overflow-hidden rounded-[20px] border border-white/8 bg-[#091017]">
                <div className="hidden grid-cols-[90px_100px_1fr_1.1fr] gap-3 border-b border-white/8 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 md:grid">
                  <span>Severity</span>
                  <span>Time</span>
                  <span>Source</span>
                  <span>Type</span>
                </div>

                {alertsLoading ? (
                  <div className="flex items-center justify-center gap-3 px-4 py-8 text-base text-zinc-400">
                    <LoaderCircle size={18} className="animate-spin" />
                    Loading alerts...
                  </div>
                ) : alerts.length > 0 ? (
                  alerts.map((alert, index) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => void handleSelectAlert(alert.id)}
                      className={`block w-full px-4 py-4 text-left transition-colors hover:bg-white/[0.03] ${
                        index < alerts.length - 1 ? "theme-gridline border-b border-white/6" : ""
                      } ${selectedAlert?.id === alert.id ? "bg-white/[0.04]" : ""}`}
                    >
                      <div className="hidden grid-cols-[90px_100px_1fr_1.1fr] gap-3 text-sm md:grid">
                        <span className="rounded-full bg-rose-500/15 px-3 py-1 text-center font-semibold text-rose-300">
                          {titleCaseSeverity(alert.severity)}
                        </span>
                        <span className="theme-section-copy text-sm text-zinc-400">
                          {formatAlertTimestamp(alert.created_at)}
                        </span>
                        <span className="theme-section-title text-base font-medium text-white">{alert.source_name}</span>
                        <span className="theme-section-copy text-sm text-zinc-300">{alert.title}</span>
                      </div>

                      <div className="space-y-3 md:hidden">
                        <div className="flex items-start justify-between gap-3">
                          <span className="rounded-full bg-rose-500/15 px-3 py-1 text-center text-xs font-semibold text-rose-300">
                            {titleCaseSeverity(alert.severity)}
                          </span>
                          <span className="theme-section-copy text-base text-zinc-400">
                            {formatAlertTimestamp(alert.created_at)}
                          </span>
                        </div>
                        <div>
                          <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            Source
                          </p>
                          <p className="theme-section-title mt-1 text-base font-medium text-white">{alert.source_name}</p>
                        </div>
                        <div>
                          <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            Type
                          </p>
                          <p className="theme-section-copy mt-1 text-base text-zinc-300">{alert.title}</p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-base text-zinc-400">
                    No alerts yet. Ingest a risky AI or system event to populate this queue.
                  </div>
                )}
              </div>

              <div className="theme-input-surface mt-4 rounded-[18px] border border-sky-500/15 bg-sky-500/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sky-300">
                  Selected alert evidence
                </p>
                {selectedAlert ? (
                  <>
                    <p className="theme-section-title mt-3 text-base font-semibold text-white">
                      {selectedAlert.title}
                    </p>
                    <p className="theme-section-copy mt-2 text-base text-zinc-300">
                      {selectedAlert.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-base">
                      <span className="theme-surface-muted rounded-full bg-white/[0.04] px-3 py-1 text-zinc-300">
                        Status: {titleCaseSeverity(selectedAlert.status)}
                      </span>
                      <span className="theme-surface-muted rounded-full bg-white/[0.04] px-3 py-1 text-zinc-300">
                        Severity: {titleCaseSeverity(selectedAlert.severity)}
                      </span>
                      <span className="theme-surface-muted rounded-full bg-white/[0.04] px-3 py-1 text-zinc-300">
                        Score: {selectedAlert.score.toFixed(2)}
                      </span>
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-300">
                        Event ID: {selectedAlert.event_id ?? "N/A"}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleAlertStatusUpdate("acknowledge")}
                        disabled={alertActionLoading !== null || selectedAlert.status !== "open"}
                        className="theme-muted-button inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {alertActionLoading === "acknowledge" ? <LoaderCircle size={14} className="animate-spin" /> : null}
                        Acknowledge
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAlertStatusUpdate("resolve")}
                        disabled={alertActionLoading !== null || selectedAlert.status === "resolved"}
                        className="theme-primary-button inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {alertActionLoading === "resolve" ? <LoaderCircle size={14} className="animate-spin" /> : null}
                        Resolve
                      </button>
                    </div>
                    {Object.keys(selectedAlert.metadata).length > 0 ? (
                      <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                        <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                          Detection metadata
                        </p>
                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-sm text-zinc-300">
                          {JSON.stringify(selectedAlert.metadata, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="theme-section-copy mt-3 text-base text-zinc-300">
                    Select an alert to inspect its detection reason, severity, score, and linked event.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="theme-panel rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#0a1218_0%,#080c12_100%)] p-5">
              <div className="theme-gridline mb-4 flex items-center justify-between border-b border-white/8 pb-4">
                <div>
                  <h3 className="theme-section-title text-lg font-semibold text-white">
                    Compliance report
                  </h3>
                  <p className="theme-section-copy mt-1 text-base text-zinc-400">
                    Generate an audit-ready snapshot with integrity posture, alert counts, source coverage, and recent evidence.
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleGenerateAuditReport()}
                  disabled={auditReportLoading || !selectedProjectId}
                  className="theme-primary-button inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {auditReportLoading ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Generate report
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopyAuditReport()}
                  disabled={!auditReport}
                  className="theme-muted-button inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Copy size={16} />
                  Copy JSON
                </button>
              </div>

              {auditReport ? (
                <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="grid gap-3">
                    <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] px-4 py-3">
                      <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Report summary
                      </p>
                      <p className="theme-section-title mt-1 text-base font-semibold text-white">
                        {auditReport.project_name}
                      </p>
                      <p className="theme-section-copy mt-2 text-base text-zinc-300">
                        {auditReport.summary}
                      </p>
                      <p className="theme-section-copy mt-2 text-sm text-zinc-500">
                        Generated {formatAlertTimestamp(auditReport.generated_at)} · {auditReport.reporting_window}
                      </p>
                    </div>
                    <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] px-4 py-3">
                      <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Control posture
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-sm text-zinc-400">Integrity score</p>
                          <p className="text-base font-semibold text-white">
                            {auditReport.integrity_score_percent.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-zinc-400">Verified events</p>
                          <p className="text-base font-semibold text-white">
                            {auditReport.verified_events}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-zinc-400">Open alerts</p>
                          <p className="text-base font-semibold text-white">
                            {auditReport.open_alerts}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-zinc-400">Critical alerts</p>
                          <p className="text-base font-semibold text-white">
                            {auditReport.critical_alerts}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] px-4 py-3">
                      <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Source coverage
                      </p>
                      <div className="mt-3 space-y-2">
                        {auditReport.source_summaries.length > 0 ? (
                          auditReport.source_summaries.map((source) => (
                            <div
                              key={source.source_id}
                              className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300"
                            >
                              <p className="font-semibold text-white">
                                {source.source_name} · {source.source_type}
                              </p>
                              <p className="mt-1 text-zinc-400">
                                Status: {source.status} · Key prefix: {source.api_key_prefix ?? "N/A"}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="theme-section-copy text-base text-zinc-400">
                            No sources registered for this project yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] p-4">
                      <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Recent alerts
                      </p>
                      <div className="mt-3 space-y-2">
                        {auditReport.recent_alerts.length > 0 ? (
                          auditReport.recent_alerts.map((alert) => (
                            <div
                              key={alert.alert_id}
                              className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300"
                            >
                              <p className="font-semibold text-white">{alert.title}</p>
                              <p className="mt-1 text-zinc-400">
                                {titleCaseSeverity(alert.severity)} · {alert.status} · {alert.source_name} · Score {alert.score.toFixed(2)}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="theme-section-copy text-base text-zinc-400">
                            No alerts recorded in this report snapshot.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] p-4">
                      <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Recent evidence
                      </p>
                      <div className="mt-3 space-y-2">
                        {auditReport.recent_events.length > 0 ? (
                          auditReport.recent_events.map((event) => (
                            <div
                              key={event.event_id}
                              className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300"
                            >
                              <p className="font-semibold text-white">
                                {event.label} · {titleCaseKind(event.kind)}
                              </p>
                              <p className="mt-1 text-zinc-400">
                                {event.source_name} · {formatAlertTimestamp(event.timestamp)} · Actor {event.actor_id ?? "Unknown"}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="theme-section-copy text-base text-zinc-400">
                            No recent events captured for this project yet.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] p-4">
                      <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Raw report JSON
                      </p>
                      <pre className="mt-2 max-h-[320px] overflow-auto whitespace-pre-wrap break-words text-sm text-zinc-300">
                        {JSON.stringify(auditReport, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[18px] border border-white/8 bg-[#091017] px-4 py-8 text-base text-zinc-400">
                  Generate a report to capture the selected project’s current controls, evidence, sources, and alert posture in one snapshot.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <div className="theme-panel rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#0a1218_0%,#080c12_100%)] p-5">
              <div className="theme-gridline mb-4 flex items-center justify-between border-b border-white/8 pb-4">
                <div>
                  <h3 className="theme-section-title text-lg font-semibold text-white">
                    Analyst copilot
                  </h3>
                  <p className="theme-section-copy mt-1 text-base text-zinc-400">
                    Chat with BlackLogix using the selected project, alert, and event as live investigation context.
                  </p>
                </div>
                <Cloud className="h-5 w-5 text-sky-300" />
              </div>

              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] px-4 py-3">
                  <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    Project context
                  </p>
                  <p className="theme-section-title mt-1 text-base font-semibold text-white">
                    {selectedProjectName}
                  </p>
                </div>
                <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] px-4 py-3">
                  <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    Alert context
                  </p>
                  <p className="theme-section-title mt-1 text-base font-semibold text-white">
                    {selectedAlert?.title ?? "No alert selected"}
                  </p>
                </div>
                <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] px-4 py-3">
                  <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    Event context
                  </p>
                  <p className="theme-section-title mt-1 text-base font-semibold text-white">
                    {selectedEvent?.event_type ?? selectedEvent?.service ?? "No event selected"}
                  </p>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleContextQuickPrompt()}
                  disabled={chatSending || !selectedProjectId}
                  className="theme-primary-button inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {chatSending ? <LoaderCircle size={16} className="animate-spin" /> : <Activity size={16} />}
                  Explain current context
                </button>
              </div>

              <div className="theme-chat-shell h-[min(78vh,720px)] overflow-hidden rounded-[30px] border border-white/10 bg-[#0f0f0f] shadow-[0_35px_120px_rgba(0,0,0,0.45)]">
                <BoltStyleChat
                  title="What should we"
                  highlightWord="analyze"
                  ending=" next?"
                  subtitle="This chat automatically uses the selected project, alert, and incident replay as investigation context."
                  announcementText="BlackLogix Analyst Copilot"
                  placeholder="Ask for evidence review, alert explanation, integrity interpretation, or next-step guidance..."
                  onSend={(message) => {
                    void handleAnalystChatSend(message);
                  }}
                  onInvestigate={() => {
                    void handleContextQuickPrompt();
                  }}
                  messages={chatMessages}
                  isSending={chatSending}
                  error={chatError}
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="theme-panel rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#0a1218_0%,#080c12_100%)] p-5">
              <div className="theme-gridline mb-4 flex items-center justify-between border-b border-white/8 pb-4">
                <div>
                  <h3 className="theme-section-title text-lg font-semibold text-white">
                    Incident replay
                  </h3>
                  <p className="theme-section-copy mt-1 text-base text-zinc-400">
                    Inspect the exact stored event, replay its context, and review integrity fields from the selected evidence.
                  </p>
                </div>
                <Activity className="h-5 w-5 text-sky-300" />
              </div>

              {selectedEvent ? (
                <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="grid gap-3">
                    <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] px-4 py-3">
                      <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Event summary
                      </p>
                      <p className="theme-section-title mt-1 text-base font-semibold text-white">
                        {selectedEvent.event_type ?? selectedEvent.service ?? "Unnamed event"}
                      </p>
                      <p className="theme-section-copy mt-1 text-base text-zinc-400">
                        {titleCaseKind(selectedEvent.kind)} event from {selectedEvent.source_name} at {formatAlertTimestamp(selectedEvent.timestamp)}.
                      </p>
                    </div>
                    <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] px-4 py-3">
                      <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Replay context
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-sm text-zinc-400">Source</p>
                          <p className="text-base font-semibold text-white">{selectedEvent.source_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-zinc-400">Type</p>
                          <p className="text-base font-semibold text-white">{selectedEvent.source_type}</p>
                        </div>
                        <div>
                          <p className="text-sm text-zinc-400">Actor</p>
                          <p className="text-base font-semibold text-white">{selectedEvent.actor_id ?? "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-zinc-400">Confidence</p>
                          <p className="text-base font-semibold text-white">
                            {selectedEvent.confidence_score !== null ? selectedEvent.confidence_score.toFixed(2) : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] px-4 py-3">
                      <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Integrity chain
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-zinc-300">
                        <p><span className="text-zinc-500">Algorithm:</span> {selectedEvent.hash_algorithm ?? "N/A"}</p>
                        <p><span className="text-zinc-500">Raw hash:</span> {selectedEvent.raw_hash ?? "N/A"}</p>
                        <p><span className="text-zinc-500">Previous hash:</span> {selectedEvent.previous_hash ?? "N/A"}</p>
                        <p><span className="text-zinc-500">Chain hash:</span> {selectedEvent.chain_hash ?? "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {selectedEvent.prompt ? (
                      <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] p-4">
                        <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                          Prompt
                        </p>
                        <pre className="mt-2 whitespace-pre-wrap break-words text-base text-zinc-200">
                          {selectedEvent.prompt}
                        </pre>
                      </div>
                    ) : null}
                    {selectedEvent.response ? (
                      <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] p-4">
                        <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                          Response
                        </p>
                        <pre className="mt-2 whitespace-pre-wrap break-words text-base text-zinc-200">
                          {selectedEvent.response}
                        </pre>
                      </div>
                    ) : null}
                    <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] p-4">
                      <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Raw payload
                      </p>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-sm text-zinc-300">
                        {JSON.stringify(selectedEvent.raw_payload, null, 2)}
                      </pre>
                    </div>
                    <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] p-4">
                      <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Event metadata
                      </p>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-sm text-zinc-300">
                        {JSON.stringify(selectedEvent.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[18px] border border-white/8 bg-[#091017] px-4 py-8 text-base text-zinc-400">
                  Select an event from the explorer or click an alert to replay the linked evidence here.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
