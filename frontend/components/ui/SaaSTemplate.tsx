"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  ChevronRight,
  Cloud,
  FileText,
  Fingerprint,
  HelpCircle,
  KeyRound,
  Link2,
  MessageSquareQuote,
  Monitor,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { BoltStyleChat } from "@/components/ui/BoltStyleChat";
import { IconContainer, Radar } from "@/components/ui/RadarEffect";
import SiteHeader from "@/components/ui/SiteHeader";
import SiteFooter from "@/components/ui/SiteFooter";
import { useTheme } from "@/components/ui/ThemeProvider";
import { getAuthToken } from "@/lib/auth";
import { navigateTo } from "@/lib/navigation";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "gradient";
  size?: "default" | "sm" | "lg";
  children: React.ReactNode;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "default",
      size = "default",
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      default: "theme-primary-button bg-white text-black hover:bg-zinc-200",
      secondary: "bg-zinc-800 text-white hover:bg-zinc-700",
      ghost: "text-white hover:bg-white/8",
      gradient:
        "theme-primary-button bg-gradient-to-b from-white via-zinc-100 to-zinc-300 text-black shadow-[0_10px_40px_rgba(255,255,255,0.18)] hover:scale-[1.02] active:scale-[0.98]",
    };

    const sizes = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-10 px-5 text-sm",
      lg: "h-14 px-12 text-[15px]",
    };

    return (
      <button
        ref={ref}
        className={cx(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

const testimonials = [
  {
    name: "Ava Thompson",
    role: "CISO, Northstar Financial",
    quote:
      "We ingested live Windows event logs during the demo and BlockLogix immediately showed us the hash-backed audit trail. That made the alert review feel credible from the first click.",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
    delay: 0.2,
  },
  {
    name: "Liam Chen",
    role: "SOC Lead, Orbitly",
    quote:
      "The anomaly engine surfaced a suspicious login pattern before our team even finished filtering the event stream. Seeing the immutable hash beside the evidence closed the trust gap immediately.",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
    delay: 0.4,
  },
  {
    name: "Sophia Martinez",
    role: "Incident Response Manager, Frame Foundry",
    quote:
      "In incident response, evidence disappears fast. BlockLogix gave us the exact log lines, the alert context, and proof that the records had not been tampered with.",
    avatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=160&q=80",
    delay: 0.3,
  },
  {
    name: "Noah Patel",
    role: "Security Architect, ScaleGrid",
    quote:
      "What stood out was the chain-of-custody story. Even if an attacker touched the source systems, the evidence preserved in BlockLogix still held up for investigation.",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80",
    delay: 0.5,
  },
  {
    name: "Isabella Brooks",
    role: "Compliance Director, Solstice",
    quote:
      "The platform made audit conversations simpler. We could show the ledger, the alert, and the preserved log entry in one workflow instead of stitching evidence together by hand.",
    avatar:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=160&q=80",
    delay: 0.8,
  },
  {
    name: "Ethan Walker",
    role: "Detection Engineer, Launchcraft",
    quote:
      "We used BlockLogix to validate detections against live telemetry. It was fast to inspect the alert, confirm the source event, and prove the underlying evidence was intact.",
    avatar:
      "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=160&q=80",
    delay: 0.6,
  },
  {
    name: "Mia Johnson",
    role: "Security Consultant, Brightline Studio",
    quote:
      "CISOs respond to this demo because it answers the obvious question: can I trust the logs? BlockLogix makes the answer visible with every alert.",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=160&q=80",
    delay: 0.7,
  },
];

const testimonialRows = [testimonials.slice(0, 3), testimonials.slice(3, 5), testimonials.slice(5)];

const dashboardMetrics = [
  { label: "Total Events Processed", value: "48.2M", note: "+3.8M in the last 24h" },
  { label: "Open Alerts", value: "37", note: "11 require immediate analyst review" },
  { label: "Compliance Grade", value: "A-", note: "98.7% of audited events are verified" },
];

const threatSources = [
  {
    label: "185.143.223.41",
    meta: "Brute-force login attempts",
    impact: "14 alerts",
  },
  {
    label: "svc-backup-admin",
    meta: "Privilege escalation sequence",
    impact: "9 alerts",
  },
  {
    label: "AWS CloudTrail / us-east-1",
    meta: "Unexpected data egress pattern",
    impact: "6 alerts",
  },
  {
    label: "vpn-gateway-02",
    meta: "Anomalous session timing",
    impact: "4 alerts",
  },
];

const setupWizardSteps = [
  {
    title: "Add Server",
    description: "Seed Windows or Linux event streams into the immutable log ledger.",
    fields: ["Host", "Port", "Credentials"],
    status: "Connected",
  },
  {
    title: "Add Cloud Audit Trail",
    description: "Attach cloud-native audit trails and preserve every event hash on-chain.",
    fields: ["Provider", "Tenant / Account", "Access Key"],
    status: "Ready",
  },
];

const alertRows = [
  {
    severity: "Critical",
    time: "13:42 UTC",
    source: "WIN-SRV-07",
    type: "Suspicious login pattern",
    confidence: "98.1%",
    recordId: "BLX-0x8f12c1ab7e",
    raw: "4625 | user=svc-admin | src=185.143.223.41 | 17 failed attempts in 4m",
  },
  {
    severity: "High",
    time: "12:19 UTC",
    source: "AWS CloudTrail",
    type: "Data egress anomaly",
    confidence: "93.4%",
    recordId: "BLX-0x4ce8ad129c",
    raw: "GetObject burst from backup archive outside expected region policy",
  },
  {
    severity: "Medium",
    time: "11:08 UTC",
    source: "VPN Gateway 02",
    type: "Geo-velocity mismatch",
    confidence: "84.7%",
    recordId: "BLX-0x72a91f0de4",
    raw: "User authenticated from Berlin 8 minutes after a New York session",
  },
];

const evidenceTimeline = [
  "13:36 UTC: Windows event logs ingested from WIN-SRV-07.",
  "13:37 UTC: Each event hashed and committed to the blockchain ledger.",
  "13:41 UTC: AI flagged repeated failed authentication attempts for svc-admin.",
  "13:42 UTC: Alert opened with raw log line, confidence score, and blockchain record ID.",
];

const complianceHashes = [
  "HIPAA-APR-2026-0x8f12c1ab",
  "HIPAA-APR-2026-0x4ce8ad12",
  "HIPAA-APR-2026-0x72a91f0d",
];

const integrationOptions = [
  {
    name: "Splunk HEC",
    detail: "Forward verified evidence into analyst workflows.",
    enabled: true,
  },
  {
    name: "AWS CloudTrail",
    detail: "Continuously ingest cloud audit events.",
    enabled: true,
  },
  {
    name: "Malware signature enrichment",
    detail: "Add IOC matching during anomaly analysis.",
    enabled: false,
  },
];

function AnalyticsPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="theme-panel rounded-[18px] border border-[#102627] bg-[linear-gradient(180deg,#041314_0%,#030a0b_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <div className="theme-gridline mb-4 flex items-start justify-between gap-4 border-b border-[#0d2021] pb-3">
        <div>
          <h3 className="theme-section-title text-[15px] font-semibold uppercase tracking-[0.06em] text-[#cfe4de]">
            {title}
          </h3>
          {subtitle ? (
            <p className="theme-section-copy mt-1 text-[12px] uppercase tracking-[0.08em] text-[#4f8e91]">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="theme-section-copy text-[12px] font-semibold uppercase tracking-[0.08em] text-[#d4c2cc]">
          Options
        </div>
      </div>
      {children}
    </div>
  );
}

function AnalyticsHistogram({
  bars,
  linePoints,
  leftTicks,
  rightTicks,
  barLabel,
  lineLabel,
  dashedX,
}: {
  bars: number[];
  linePoints: string;
  leftTicks: string[];
  rightTicks: string[];
  barLabel: string;
  lineLabel: string;
  dashedX: number;
}) {
  const chartHeight = 220;
  const chartWidth = 470;
  const maxBar = Math.max(...bars);
  const barWidth = chartWidth / bars.length;

  return (
    <div>
      <div className="grid grid-cols-[38px_minmax(0,1fr)_42px] gap-3">
        <div className="theme-chart-axis-left flex h-[220px] flex-col justify-between text-[12px] font-semibold text-[#1db8ff]">
          {leftTicks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>

        <div className="relative h-[220px]">
          {[0, 1, 2, 3, 4].map((line) => (
            <div
              key={line}
              className="theme-gridline absolute left-0 right-0 border-t border-[#0d2021]"
              style={{ top: `${(line / 4) * 100}%` }}
            />
          ))}

          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-full w-full overflow-visible">
            {bars.map((value, index) => {
              const height = (value / maxBar) * (chartHeight - 12);
              return (
                <rect
                  key={`${value}-${index}`}
                  x={index * barWidth + 3}
                  y={chartHeight - height}
                  width={Math.max(barWidth - 6, 6)}
                  height={height}
                  rx="1.5"
                  fill="#13d8f0"
                  opacity={0.88 - index * 0.02}
                />
              );
            })}

            <line
              x1={dashedX}
              x2={dashedX}
              y1="0"
              y2={chartHeight}
              stroke="#16b5ff"
              strokeDasharray="6 6"
              strokeWidth="2"
              opacity="0.9"
            />

            <text x={dashedX + 8} y="18" fill="#19c6ff" fontSize="11" fontWeight="700">
              Median
            </text>

            <polyline
              points={linePoints}
              fill="none"
              stroke="#e9a6be"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="theme-chart-axis-right flex h-[220px] flex-col justify-between text-right text-[12px] font-semibold text-[#e6a1b7]">
          {rightTicks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
      </div>

      <div className="theme-section-copy mt-4 flex flex-wrap items-center justify-center gap-5 text-[12px] text-[#c6d8d2]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#13d8f0]" />
          {barLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-[2px] w-4 rounded-full bg-[#e9a6be]" />
          {lineLabel}
        </span>
      </div>
    </div>
  );
}

function DashboardMetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="theme-panel rounded-[16px] border border-[#12393a] bg-[linear-gradient(180deg,#041314_0%,#051011_100%)] p-4">
      <p className="theme-section-copy text-[13px] uppercase tracking-[0.08em] text-[#73a6a6]">{label}</p>
      <p className="theme-section-title mt-2 text-[30px] font-bold tracking-[-0.04em] text-[#f3fff8]">
        {value}
      </p>
      <p className="theme-section-copy mt-2 text-[13px] text-[#5c8a8d]">{note}</p>
    </div>
  );
}

function ThreatSourcesPanel() {
  return (
    <AnalyticsPanel title="Top Threat Sources" subtitle="IPs, identities, and assets driving detections">
      <div className="space-y-3">
        {threatSources.map((source, index) => (
          <div
            key={source.label}
          className="theme-item-surface flex items-start justify-between gap-4 rounded-[14px] border border-[#103133] bg-[#051011] px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#0d2b2d] text-[11px] font-bold text-[#5cf6df]">
                {index + 1}
              </div>
              <div>
                <p className="theme-section-title text-base font-semibold text-[#effff7]">{source.label}</p>
                <p className="theme-section-copy mt-1 text-sm text-[#78a6a8]">{source.meta}</p>
              </div>
            </div>
            <span className="rounded-full bg-[#0f2729] px-3 py-1 text-[12px] font-semibold text-[#98fff0]">
              {source.impact}
            </span>
          </div>
        ))}
      </div>
    </AnalyticsPanel>
  );
}

function PlatformWorkflowSection() {
  const selectedAlert = alertRows[0];

  return (
    <section className="relative overflow-hidden px-5 pb-24 md:px-7 md:pb-28">
      <div className="theme-section-shell absolute inset-0 bg-[linear-gradient(180deg,#030607_0%,#05080d_100%)]" />
      <div className="theme-section-glow absolute right-[12%] top-32 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-[1600px]">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/8 px-4 py-2 text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">
            <ShieldCheck size={14} />
            Platform Workflow
          </div>
          <h2 className="theme-section-title mt-6 text-balance text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
            From ingestion to proof-backed response
          </h2>
          <p className="theme-section-copy mx-auto mt-5 max-w-2xl text-lg leading-8 text-zinc-400 md:text-xl">
            These wireframes show the full analyst journey: onboarding new sources,
            triaging alerts, verifying evidence in the ledger, generating compliance
            reports, and managing integrations.
          </p>
        </div>

        <div className="mt-14 grid gap-6 xl:grid-cols-2">
          <div className="theme-panel rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,#071015_0%,#04080d_100%)] p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sky-300">
                <Monitor size={20} />
              </div>
              <div>
                <h3 className="theme-section-title text-2xl font-semibold text-white">
                  Login & Setup Screen
                </h3>
                <p className="theme-section-copy text-base text-zinc-400">
                  Admins authenticate, then complete an onboarding wizard for live log sources.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="theme-card-surface rounded-[22px] border border-white/8 bg-[#070c10] p-5">
                <p className="theme-section-title text-base font-semibold text-white">Secure analyst login</p>
                <div className="mt-4 space-y-3">
                  {["Email address", "Password", "MFA code"].map((field) => (
                    <div key={field} className="theme-input-surface rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-base text-zinc-500">
                      {field}
                    </div>
                  ))}
                </div>
                <button className="theme-primary-button mt-4 h-11 w-full rounded-xl bg-white font-semibold text-black">
                  Enter Console
                </button>
              </div>

              <div className="theme-card-surface rounded-[22px] border border-white/8 bg-[#070c10] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-base font-semibold uppercase tracking-[0.08em] text-sky-300">
                    Onboarding Wizard
                  </p>
                  <span className="theme-faint-text text-sm text-zinc-500">Step 2 of 4</span>
                </div>

                <div className="space-y-4">
                  {setupWizardSteps.map((step) => (
                    <div
                      key={step.title}
                      className="theme-input-surface rounded-[18px] border border-white/8 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="theme-section-title text-lg font-semibold text-white">{step.title}</p>
                          <p className="theme-section-copy mt-1 text-base leading-7 text-zinc-400">
                            {step.description}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">
                          {step.status}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {step.fields.map((field) => (
                          <div
                            key={field}
                            className="theme-input-surface rounded-xl border border-white/8 bg-[#091117] px-3 py-2 text-base text-zinc-500"
                          >
                            {field}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="theme-panel rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,#071015_0%,#04080d_100%)] p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-rose-300">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="theme-section-title text-2xl font-semibold text-white">
                  Alerts Table
                </h3>
                <p className="theme-section-copy text-base text-zinc-400">
                  Severity, source, type, confidence, raw log evidence, and blockchain record IDs.
                </p>
              </div>
            </div>

            <div className="theme-card-surface mt-6 overflow-hidden rounded-[22px] border border-white/8 bg-[#070c10]">
              <div className="theme-gridline theme-faint-text grid grid-cols-[88px_110px_1fr_1.2fr] gap-3 border-b border-white/8 px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                <span>Severity</span>
                <span>Time</span>
                <span>Source</span>
                <span>Type</span>
              </div>

              {alertRows.map((row, index) => (
                <div
                  key={row.recordId}
                  className={cx(
                    "theme-gridline border-b border-white/6 px-4 py-4",
                    index === alertRows.length - 1 && "border-b-0",
                  )}
                >
                  <div className="grid grid-cols-[88px_110px_1fr_1.2fr] gap-3 text-base">
                    <span className="rounded-full bg-rose-500/15 px-3 py-1 text-center font-semibold text-rose-300">
                      {row.severity}
                    </span>
                    <span className="theme-section-copy text-zinc-400">{row.time}</span>
                    <span className="theme-section-title font-medium text-white">{row.source}</span>
                    <span className="theme-section-copy text-zinc-300">{row.type}</span>
                  </div>

                  {index === 0 ? (
                    <div className="mt-4 rounded-[18px] border border-sky-500/15 bg-sky-500/5 p-4">
                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-sky-300">
                            Raw log lines
                          </p>
                          <pre className="theme-input-surface mt-2 overflow-x-auto rounded-xl border border-white/6 bg-[#091117] p-3 text-sm leading-7 text-zinc-300">
                            {selectedAlert.raw}
                          </pre>
                        </div>
                        <div className="space-y-3">
                          <div className="theme-input-surface rounded-xl border border-white/8 bg-[#091117] p-3">
                            <p className="theme-faint-text text-sm text-zinc-500">
                              AI confidence score
                            </p>
                            <p className="theme-section-title mt-2 text-xl font-semibold text-white">
                              {selectedAlert.confidence}
                            </p>
                          </div>
                          <div className="theme-input-surface rounded-xl border border-white/8 bg-[#091117] p-3">
                            <p className="theme-faint-text text-sm text-zinc-500">
                              Blockchain Record ID
                            </p>
                            <p className="mt-2 text-base font-semibold text-emerald-300">
                              {selectedAlert.recordId}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="theme-panel rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,#071015_0%,#04080d_100%)] p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-emerald-300">
                <Fingerprint size={20} />
              </div>
              <div>
                <h3 className="theme-section-title text-2xl font-semibold text-white">
                  Alert Detail View
                </h3>
                <p className="theme-section-copy text-base text-zinc-400">
                  Chronicle the event, inspect the exact log snippet, and verify the ledger record.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="theme-card-surface rounded-[22px] border border-white/8 bg-[#070c10] p-5">
                <p className="theme-faint-text text-base font-semibold uppercase tracking-[0.08em] text-zinc-400">
                  Event chronology
                </p>
                <div className="mt-4 space-y-4">
                  {evidenceTimeline.map((event, index) => (
                    <div key={event} className="flex gap-3">
                      <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-300">
                        {index + 1}
                      </div>
                      <p className="theme-section-copy text-base leading-7 text-zinc-300">{event}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="theme-card-surface rounded-[22px] border border-white/8 bg-[#070c10] p-5">
                  <p className="theme-faint-text text-base font-semibold uppercase tracking-[0.08em] text-zinc-400">
                    Verify in Ledger
                  </p>
                  <div className="mt-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                    <p className="theme-section-copy text-base text-zinc-300">
                      Block transaction:
                      <span className="ml-2 font-semibold text-emerald-300">
                        0xa3d8...7be2
                      </span>
                    </p>
                    <p className="theme-section-copy mt-2 text-base text-zinc-400">
                      Immutable hash anchored to alert record {selectedAlert.recordId}.
                    </p>
                    <button className="theme-primary-button mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-base font-semibold text-black">
                      <Link2 size={14} />
                      Verify in Ledger
                    </button>
                  </div>
                </div>

                <div className="theme-card-surface rounded-[22px] border border-white/8 bg-[#070c10] p-5">
                  <p className="theme-faint-text text-base font-semibold uppercase tracking-[0.08em] text-zinc-400">
                    Affected assets
                  </p>
                  <div className="mt-4 flex h-[154px] items-center justify-center rounded-2xl border border-white/8 bg-[radial-gradient(circle_at_center,rgba(30,144,255,0.14),transparent_55%)]">
                    <div className="relative h-28 w-48">
                      <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-400/50 bg-sky-400/10" />
                      <div className="absolute left-0 top-5 h-8 w-8 rounded-full border border-emerald-400/40 bg-emerald-400/10" />
                      <div className="absolute right-0 top-4 h-8 w-8 rounded-full border border-amber-400/40 bg-amber-400/10" />
                      <div className="absolute bottom-0 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full border border-rose-400/40 bg-rose-400/10" />
                      <div className="absolute left-7 top-9 h-px w-16 bg-white/20" />
                      <div className="absolute right-7 top-9 h-px w-16 bg-white/20" />
                      <div className="absolute bottom-7 left-1/2 h-10 w-px -translate-x-1/2 bg-white/20" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="theme-panel rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,#071015_0%,#04080d_100%)] p-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="theme-card-surface rounded-[22px] border border-white/8 bg-[#070c10] p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-violet-300">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Compliance Report Generator</h3>
                    <p className="theme-section-copy text-base text-zinc-400">
                      Choose a regulation and export a report with cryptographic hashes.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {["Time range: Last 30 days", "Regulation: HIPAA Audit", "Format: PDF report"].map((field) => (
                    <div
                      key={field}
                      className="theme-input-surface rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-base text-zinc-300"
                    >
                      {field}
                    </div>
                  ))}
                </div>

                <div className="theme-input-surface mt-4 rounded-[18px] border border-white/8 bg-[#091117] p-4">
                  <p className="theme-faint-text text-sm font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    Included hashes
                  </p>
                  <div className="mt-3 space-y-2">
                    {complianceHashes.map((hash) => (
                      <div
                        key={hash}
                        className="theme-hash-chip rounded-lg bg-black/30 px-3 py-2 text-sm text-emerald-300"
                      >
                        {hash}
                      </div>
                    ))}
                  </div>
                </div>

                <button className="theme-primary-button mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-base font-semibold text-black">
                  Generate PDF
                </button>
              </div>

              <div className="theme-card-surface rounded-[22px] border border-white/8 bg-[#070c10] p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sky-300">
                    <Settings size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Settings & Integrations</h3>
                    <p className="theme-section-copy text-base text-zinc-400">
                      Manage API keys, endpoints, and analysis toggles.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="theme-input-surface rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-base text-zinc-300">
                      API key
                    </div>
                    <div className="theme-input-surface rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-base text-zinc-300">
                      Endpoint URL
                    </div>
                  </div>

                  {integrationOptions.map((integration) => (
                    <div
                      key={integration.name}
                      className="theme-input-surface flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-[#091117] px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        {integration.name.includes("Cloud") ? (
                          <Cloud size={18} className="mt-0.5 text-sky-300" />
                        ) : integration.name.includes("Splunk") ? (
                          <Server size={18} className="mt-0.5 text-emerald-300" />
                        ) : (
                          <KeyRound size={18} className="mt-0.5 text-amber-300" />
                        )}
                        <div>
                          <p className="text-base font-medium text-white">{integration.name}</p>
                          <p className="theme-section-copy mt-1 text-sm text-zinc-400">
                            {integration.detail}
                          </p>
                        </div>
                      </div>
                      <button
                        className={cx(
                          "relative h-7 w-12 rounded-full transition-colors",
                          integration.enabled ? "bg-emerald-500/30" : "bg-white/10",
                        )}
                        aria-label={`${integration.enabled ? "Disable" : "Enable"} ${integration.name}`}
                      >
                        <span
                          className={cx(
                            "absolute top-1 h-5 w-5 rounded-full bg-white transition-all",
                            integration.enabled ? "left-6" : "left-1",
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MultiMetricChart() {
  return (
    <AnalyticsPanel title="Alert Volume vs Ledger Integrity">
      <div className="theme-gridline grid grid-cols-3 gap-4 border-b border-[#0d2021] pb-4">
        <div>
          <p className="text-[13px] font-semibold text-[#11b8ff]">Alert Confidence</p>
          <p className="mt-2 text-[20px] font-bold text-[#11b8ff]">97.4%</p>
          <p className="text-[12px] text-[#4f8e91]">AI triage</p>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[#af56aa]">Verified Events</p>
          <p className="mt-2 text-[20px] font-bold text-[#cf68c4]">2.7M</p>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[#f0a3bb]">Integrity Coverage</p>
          <p className="mt-2 text-[20px] font-bold text-[#ffbfd1]">100%</p>
        </div>
      </div>

      <div className="relative mt-4">
        {[0, 1, 2, 3].map((line) => (
          <div
            key={line}
            className="theme-gridline absolute left-0 right-0 border-t border-[#0d2021]"
            style={{ top: `${(line / 3) * 100}%` }}
          />
        ))}
        <svg viewBox="0 0 520 180" className="h-[180px] w-full">
          <polyline
            points="10,114 70,90 130,82 190,108 250,54 310,54 370,54 430,110 510,92"
            fill="none"
            stroke="#11b8ff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="10,30 70,36 130,42 190,50 250,120 310,122 370,118 430,40 510,34"
            fill="none"
            stroke="#af56aa"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="10,126 70,126 130,124 190,118 250,116 310,112 370,132 430,148 510,154"
            fill="none"
            stroke="#f0a3bb"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </AnalyticsPanel>
  );
}

function SessionsChart() {
  return (
    <AnalyticsPanel title="Investigations">
      <div className="theme-gridline grid grid-cols-3 gap-4 border-b border-[#0d2021] pb-4">
        <div>
          <p className="theme-investigation-label text-[13px] font-semibold text-[#62f0da]">
            Open Investigations
          </p>
          <p className="theme-investigation-value mt-2 text-[20px] font-bold text-[#71ffe2]">
            479
          </p>
          <p className="theme-investigation-note text-[12px] text-[#4f8e91]">active cases</p>
        </div>
        <div>
          <p className="theme-investigation-label text-[13px] font-semibold text-[#c3ef7f]">
            Mean Review Time
          </p>
          <p className="theme-investigation-value mt-2 text-[20px] font-bold text-[#dfff97]">
            17min
          </p>
        </div>
        <div>
          <p className="theme-investigation-label text-[13px] font-semibold text-[#97ffb5]">
            Evidence Linked
          </p>
          <p className="theme-investigation-value mt-2 text-[20px] font-bold text-[#97ffb5]">
            2.1K
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        {[0, 1, 2, 3].map((line) => (
          <div
            key={line}
            className="theme-gridline absolute left-0 right-0 border-t border-[#0d2021]"
            style={{ top: `${(line / 3) * 100}%` }}
          />
        ))}
        <svg viewBox="0 0 520 180" className="h-[180px] w-full">
          <polyline
            points="8,42 86,52 164,58 242,130 320,120 398,60 476,54"
            fill="none"
            className="theme-investigation-line-a"
            stroke="#56f5d7"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="8,116 86,106 164,110 242,156 320,176 398,96 476,22"
            fill="none"
            className="theme-investigation-line-b"
            stroke="#c4f07b"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="8,118 86,118 164,118 242,118 320,116 398,104 476,64"
            fill="none"
            className="theme-investigation-line-c"
            stroke="#8aff9c"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </AnalyticsPanel>
  );
}

function DashboardPreview() {
  const leftBars = [72, 68, 62, 48, 32, 22, 18, 15, 13, 11, 9.5, 8.3, 7.4, 6.6, 5.9, 5.1, 4.8, 4.5, 4.2, 3.8];
  const rightBars = [12, 31, 35, 31, 27, 22, 17, 14, 11, 9, 7, 5.5, 4.4, 3.7, 3.2, 2.8, 2.3, 2, 1.8, 1.6];

  return (
    <div id="components" className="relative z-10 w-full max-w-[1720px] pb-8">
      <div className="theme-dashboard-glow absolute inset-x-[18%] top-[-60px] h-64 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="theme-panel theme-components-shell relative overflow-hidden rounded-[30px] border border-[#264242] bg-[linear-gradient(180deg,#021213_0%,#020607_100%)] p-4 shadow-[0_24px_100px_rgba(0,0,0,0.72)] md:p-6">
        <div className="theme-components-overlay absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(33,117,98,0.14),transparent_38%)]" />
        <div className="theme-components-rail absolute right-4 top-4 h-[82%] w-[4px] rounded-full bg-white/10 md:right-6">
          <div className="theme-components-rail-thumb mt-4 h-24 rounded-full bg-white/70" />
        </div>

        <div className="theme-panel theme-components-inner relative z-10 rounded-[24px] border border-[#163334] bg-[linear-gradient(180deg,#031011_0%,#020607_100%)] p-4 md:p-5">
          <div className="mb-5 flex flex-col gap-4 border-b border-[#0d2021] pb-4 md:flex-row md:items-center md:justify-between">
            <div className="theme-components-heading flex items-center gap-3 text-[#f4f1e8]">
              <h3 className="theme-section-title text-[22px] font-black uppercase tracking-[0.03em] md:text-[28px]">
                Windows Event Logs: Last 7 Days Verified On-Chain
              </h3>
              <ChevronRight className="h-6 w-6 rotate-90" />
            </div>

            <div className="theme-components-chrome flex items-center gap-3 text-[#d7ebe4]">
              <Monitor className="h-5 w-5" />
              <MessageSquareQuote className="h-5 w-5" />
              <HelpCircle className="h-5 w-5" />
            </div>
          </div>

          <div className="mb-4 grid gap-4 md:grid-cols-3">
            {dashboardMetrics.map((metric) => (
              <DashboardMetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                note={metric.note}
              />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <AnalyticsPanel
              title="Events per Hour vs Anomalies Flagged"
              subtitle="Timeline of normalized event flow and anomaly counts"
            >
              <AnalyticsHistogram
                bars={leftBars}
                linePoints="12,40 20,186 35,174 55,140 74,112 95,95 118,80 142,68 168,60 194,59 224,56 255,58 286,55 318,52 350,45 382,47 414,44 446,45 470,42"
                leftTicks={["7.5K", "6.0K", "4.5K", "3.0K", "1.5K", "0"]}
                rightTicks={["100 %", "80 %", "60 %", "40 %", "20 %", "0 %"]}
                barLabel="Events / hour"
                lineLabel="Anomalies flagged"
                dashedX={52}
              />
            </AnalyticsPanel>

            <ThreatSourcesPanel />

            <MultiMetricChart />
            <SessionsChart />
          </div>
        </div>
      </div>
    </div>
  );
}

const Hero = React.memo(() => {
  const { theme } = useTheme();

  return (
    <section
      id="top"
      className="relative overflow-hidden px-5 pb-20 pt-36 md:px-7 md:pb-28 md:pt-40"
      style={{ animation: "fadeIn 0.6s ease-out" }}
    >
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="theme-hero-bg absolute inset-0 bg-[linear-gradient(180deg,#050505_0%,#020202_46%,#050505_100%)]" />
      <div className="theme-hero-overlay absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_34%)]" />
      <div className="theme-hero-glow absolute left-1/2 top-[510px] h-72 w-[70%] -translate-x-1/2 rounded-full bg-[#f97316]/12 blur-3xl" />

      <div className="relative z-10 mx-auto flex max-w-[1720px] flex-col items-center">
        <aside className="theme-hero-pill mb-12 inline-flex flex-wrap items-center justify-center gap-3 rounded-full border border-[#293247] bg-[#111722] px-6 py-3 text-sm text-zinc-400 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <span className="theme-hero-pill-text">Live demo: Windows logs secured on-chain</span>
          <a
            href="#new-version"
            className="theme-hero-pill-text flex items-center gap-1 text-zinc-400 transition-colors hover:text-white"
          >
            See evidence
            <ArrowRight size={14} />
          </a>
        </aside>

        <div className="max-w-[1040px] text-center">
          <h1
            className="text-balance text-[62px] font-medium leading-[0.98] tracking-[-0.07em] text-transparent sm:text-[82px] lg:text-[112px] xl:text-[124px]"
            style={{
              background:
                theme === "dark"
                  ? "linear-gradient(to bottom, #ffffff 0%, #f6f6f6 46%, rgba(255,255,255,0.48) 100%)"
                  : "linear-gradient(to bottom, #0f172a 0%, #334155 42%, rgba(51,65,85,0.36) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Security Evidence That
            <br />
            Attackers Cannot Erase
          </h1>

          <p className="theme-page-copy mx-auto mt-8 max-w-[880px] text-[18px] leading-[1.6] text-zinc-400 md:text-[22px]">
            BlockLogix hashes every server, network, and application log on-chain
            while AI detects anomalous logins, malware activity, and suspicious data
            movement in real time.
          </p>

          <div className="relative mt-12 inline-block">
            <div className="absolute inset-x-6 top-5 h-16 rounded-full bg-[#f97316]/35 blur-3xl" />
            <Button
              type="button"
              variant="gradient"
              size="lg"
              className="relative rounded-2xl px-12 text-[17px] font-semibold"
              aria-label="Request a BlackLogix demo"
              onClick={() => navigateTo("/register")}
            >
              Start Secure Setup
            </Button>
          </div>
        </div>

        <div className="mt-20 w-full">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
});

Hero.displayName = "Hero";

function TestimonialsRadarSection() {
  const [activePerson, setActivePerson] = React.useState(0);
  const selected = testimonials[activePerson];

  return (
    <section
      id="documentation"
      className="relative overflow-hidden px-5 pb-24 md:px-7 md:pb-32"
    >
      <div className="theme-testimonial-shell absolute inset-0 bg-[linear-gradient(180deg,#040404_0%,#080808_100%)]" />
      <div className="theme-testimonial-glow absolute left-1/2 top-16 h-64 w-[55%] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="theme-testimonial-panel relative z-10 mx-auto max-w-[1500px] rounded-[32px] border border-white/6 bg-[#05070b] px-6 py-14 shadow-[0_20px_80px_rgba(0,0,0,0.45)] md:px-10 lg:px-14">
        <div className="mx-auto max-w-[900px] text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">
            <Sparkles size={14} />
            Analyst Proof
          </div>
          <h2 className="theme-section-title mt-6 text-balance text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
            Hear how security leaders explain BlockLogix
          </h2>
          <p className="theme-section-copy mx-auto mt-5 max-w-2xl text-lg leading-8 text-zinc-400 md:text-xl">
            Click each story to see how teams describe the combination of AI
            detection, immutable evidence, and blockchain-backed audit trails.
          </p>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_420px] lg:items-center">
          <div className="theme-testimonial-radar relative flex min-h-[520px] w-full items-center justify-center overflow-hidden rounded-[28px] border border-white/6 bg-[radial-gradient(circle_at_center,rgba(14,23,38,0.9),rgba(2,6,12,0.98))] px-4 py-8">
            <div className="relative flex w-full max-w-5xl flex-col items-center justify-center gap-10">
              {testimonialRows.map((row, rowIndex) => {
                const rowWidths = ["max-w-4xl", "max-w-2xl", "max-w-4xl"];
                const rowOffset = testimonialRows
                  .slice(0, rowIndex)
                  .reduce((total, currentRow) => total + currentRow.length, 0);

                return (
                  <div key={`row-${rowIndex}`} className={`mx-auto w-full ${rowWidths[rowIndex]}`}>
                    <div className="flex w-full flex-wrap items-center justify-center gap-4 md:justify-between">
                      {row.map((person, personIndex) => {
                        const activeIndex = rowOffset + personIndex;
                        return (
                          <IconContainer
                            key={person.name}
                            text={person.name}
                            subtitle={person.role}
                            delay={person.delay}
                            avatarSrc={person.avatar}
                            active={activePerson === activeIndex}
                            onClick={() => setActivePerson(activeIndex)}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <Radar className="pointer-events-none absolute -bottom-10" />
              <div className="absolute bottom-0 z-[41] h-px w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
            </div>
          </div>

          <div className="theme-testimonial-quote rounded-[28px] border border-white/6 bg-white/[0.03] p-8 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <img
                src={selected.avatar}
                alt={selected.name}
                className="h-16 w-16 rounded-2xl object-cover"
                loading="lazy"
              />
              <div>
                <p className="theme-section-title text-2xl font-semibold text-white">{selected.name}</p>
                <p className="theme-section-copy text-base text-zinc-400">{selected.role}</p>
              </div>
            </div>

            <div className="mt-8 rounded-[24px] border border-sky-500/15 bg-sky-500/5 p-6">
              <div className="mb-5 inline-flex rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3 text-sky-300">
                <MessageSquareQuote size={22} />
              </div>
              <p className="theme-testimonial-copy text-xl leading-9 text-zinc-200 md:text-[22px] md:leading-10">
                “{selected.quote}”
              </p>
            </div>

            <div className="theme-section-copy mt-6 flex items-center gap-2 text-base text-zinc-500">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              Select another perspective from the field
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatbotLauncher() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [isSending, setIsSending] = React.useState(false);
  const [chatError, setChatError] = React.useState<string | null>(null);
  const chatApiUrl = import.meta.env.VITE_CHAT_API_URL ?? "http://localhost:8000";
  const starterPrompts = React.useMemo(
    () => ({
      investigate:
        "Investigate the most recent suspicious login, summarize the risk, and explain what evidence should be reviewed first.",
      windows:
        "Review recent Windows logs and tell me if there are failed login bursts, suspicious account activity, or integrity issues I should inspect.",
      github:
        "Review the current detection rules and suggest which rules should be tuned first for suspicious login patterns or privileged account misuse.",
    }),
    [],
  );

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const ensureChatSession = React.useCallback(async () => {
    if (sessionId) {
      return sessionId;
    }

    const authToken = getAuthToken();
    if (!authToken) {
      throw new Error("Please log in before starting a chat.")
    }

    const response = await fetch(`${chatApiUrl}/chat/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title: "New Chat" }),
    });

    const payload = (await response.json()) as { id?: string; detail?: string };
    if (!response.ok || !payload.id) {
      throw new Error(payload.detail ?? "Unable to create a chat session.")
    }

    setSessionId(payload.id);
    return payload.id;
  }, [chatApiUrl, sessionId]);

  const handleChatSend = React.useCallback(
    async (message: string) => {
      const authToken = getAuthToken();
      if (!authToken) {
        setChatError("Please log in before using the AI chat.")
        return;
      }

      const trimmedMessage = message.trim();
      if (!trimmedMessage) {
        return;
      }

      setChatError(null);
      setMessages((current) => [...current, { role: "user", content: trimmedMessage }]);
      setIsSending(true);

      try {
        const activeSessionId = await ensureChatSession();
        const response = await fetch(`${chatApiUrl}/chat/message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            session_id: activeSessionId,
            message: trimmedMessage,
          }),
        });

        const payload = (await response.json()) as {
          assistant_message?: { content?: string };
          detail?: string;
        };

        if (!response.ok || !payload.assistant_message?.content) {
          throw new Error(payload.detail ?? "Unable to get a response from the chat backend.")
        }

        setMessages((current) => [
          ...current,
          { role: "assistant", content: payload.assistant_message!.content! },
        ]);
      } catch (error) {
        setMessages((current) => current.slice(0, -1));
        setChatError(
          error instanceof Error ? error.message : "Unable to get a response from the chat backend.",
        );
      } finally {
        setIsSending(false);
      }
    },
    [chatApiUrl, ensureChatSession],
  );

  const handleQuickPrompt = React.useCallback(
    (prompt: string) => {
      setIsOpen(true);
      void handleChatSend(prompt);
    },
    [handleChatSend],
  );

  const handleImport = React.useCallback(
    (source: string) => {
      const prompt = source === "windows" ? starterPrompts.windows : starterPrompts.github;
      handleQuickPrompt(prompt);
    },
    [handleQuickPrompt, starterPrompts.github, starterPrompts.windows],
  );

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="Close chat backdrop"
          className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[2px]"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
        {isOpen ? (
          <div className="theme-chat-shell h-[min(82vh,760px)] w-[calc(100vw-20px)] max-w-[460px] overflow-hidden rounded-[30px] border border-white/10 bg-[#0f0f0f] shadow-[0_35px_120px_rgba(0,0,0,0.65)] sm:w-[min(460px,calc(100vw-32px))]">
            <BoltStyleChat
              showClose
              onClose={() => setIsOpen(false)}
              title="What log should we"
              highlightWord="verify"
              ending=" next?"
              subtitle="Ask the assistant to inspect an alert, explain an immutable hash, or summarize suspicious activity."
              announcementText="BlackLogix AI Analyst"
              placeholder="Ask about a suspicious login, blockchain proof, or incident timeline..."
              onSend={(message) => {
                void handleChatSend(message);
              }}
              onInvestigate={() => {
                handleQuickPrompt(starterPrompts.investigate);
              }}
              onImport={handleImport}
              messages={messages}
              isSending={isSending}
              error={chatError}
            />
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={isOpen ? "Close chatbot" : "Open chatbot"}
          className={cx(
            "theme-chat-launcher group flex items-center rounded-full border border-sky-400/20 bg-[#0c1320] text-white shadow-[0_18px_60px_rgba(7,14,24,0.75)] transition-all hover:border-sky-300/40 hover:bg-[#101a2b] active:scale-[0.98]",
            isOpen ? "p-2" : "p-3",
          )}
        >
          <span
            className={cx(
              "flex items-center justify-center rounded-full bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500 shadow-[0_0_25px_rgba(59,130,246,0.45)] transition-all",
              isOpen ? "h-9 w-9" : "h-12 w-12",
            )}
          >
            <Bot size={isOpen ? 18 : 22} />
          </span>
        </button>
      </div>
    </>
  );
}

export default function SaaSTemplate() {
  const { theme } = useTheme();
  return (
    <main className="theme-surface min-h-screen bg-black text-white">
      <SiteHeader homeMode />
      <Hero key={theme} />
      <PlatformWorkflowSection />
      <TestimonialsRadarSection />
      <SiteFooter />
      <ChatbotLauncher />
    </main>
  );
}
