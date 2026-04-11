"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Server,
  ShieldCheck,
} from "lucide-react";

import SiteHeader from "@/components/ui/SiteHeader";
import SiteFooter from "@/components/ui/SiteFooter";

const metrics = [
  {
    label: "Total Events Processed",
    value: "48.2M",
    note: "Immutable hashes anchored for every ingested event",
  },
  {
    label: "Open Alerts",
    value: "37",
    note: "11 critical alerts still waiting for analyst action",
  },
  {
    label: "Compliance Grade",
    value: "A-",
    note: "98.7% of audited evidence verified on-chain",
  },
];

const setupFields = {
  server: [
    { label: "Host", placeholder: "win-srv-07.internal" },
    { label: "Port", placeholder: "5985" },
    { label: "Credentials", placeholder: "svc-blocklogix" },
  ],
  cloud: [
    { label: "Provider", placeholder: "AWS CloudTrail" },
    { label: "Account / Tenant", placeholder: "prod-secops-us-east-1" },
    { label: "Access Key", placeholder: "AKIA..." },
  ],
} as const;

const threatSources = [
  ["185.143.223.41", "Brute-force login attempts", "14 alerts"],
  ["svc-backup-admin", "Privilege escalation sequence", "9 alerts"],
  ["AWS CloudTrail / us-east-1", "Unexpected data egress pattern", "6 alerts"],
  ["vpn-gateway-02", "Anomalous session timing", "4 alerts"],
] as const;

const openAlerts = [
  ["Critical", "13:42 UTC", "WIN-SRV-07", "Suspicious login pattern"],
  ["High", "12:19 UTC", "AWS CloudTrail", "Data egress anomaly"],
  ["Medium", "11:08 UTC", "VPN Gateway 02", "Geo-velocity mismatch"],
] as const;

function SetupField({
  label,
  placeholder,
}: {
  label: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="theme-input-label mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
        {label}
      </span>
      <input
        placeholder={placeholder}
        className="theme-input-field w-full rounded-xl border border-white/10 bg-[#0a1016] px-4 py-3 text-sm text-white focus:outline-none"
      />
    </label>
  );
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
      <p className="theme-faint-text text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
        {label}
      </p>
      <p className="theme-section-title mt-3 text-3xl font-bold tracking-[-0.04em] text-white">{value}</p>
      <p className="theme-section-copy mt-2 text-sm text-zinc-400">{note}</p>
    </div>
  );
}

function TimelineChart() {
  return (
    <div className="theme-panel rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#0a1218_0%,#080c12_100%)] p-5">
      <div className="theme-gridline mb-4 flex items-center justify-between gap-4 border-b border-white/8 pb-4">
        <div>
          <h3 className="theme-section-title text-lg font-semibold text-white">
            Events per hour vs anomalies flagged
          </h3>
          <p className="theme-section-copy mt-1 text-sm text-zinc-400">
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
            {[90, 110, 130, 160, 145, 170, 188, 160, 150, 175, 194, 210].map(
              (value, index) => (
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
              ),
            )}

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

export default function AnalystDashboardPage() {
  const [setupMode, setSetupMode] = React.useState<"server" | "cloud">("server");

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
              <h1 className="theme-page-title mt-4 text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
                Live security analytics and source setup
              </h1>
              <p className="theme-page-copy mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                Review the latest security telemetry, triage open alerts, and choose a log
                source option to continue onboarding your environment.
              </p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 md:w-auto">
              <button
                type="button"
                onClick={() => setSetupMode("server")}
                className={`rounded-full px-4 py-3 text-sm font-medium transition-colors sm:min-w-[170px] ${
                  setupMode === "server"
                    ? "theme-primary-button bg-white text-black"
                    : "theme-muted-button border border-white/10 bg-white/[0.03] text-zinc-300"
                }`}
              >
                Add Server
              </button>
              <button
                type="button"
                onClick={() => setSetupMode("cloud")}
                className={`rounded-full px-4 py-3 text-sm font-medium transition-colors sm:min-w-[220px] ${
                  setupMode === "cloud"
                    ? "theme-primary-button bg-white text-black"
                    : "theme-muted-button border border-white/10 bg-white/[0.03] text-zinc-300"
                }`}
              >
                Add Cloud Audit Trail
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <TimelineChart />

            <div className="theme-panel rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#0a1218_0%,#080c12_100%)] p-5">
              <div className="theme-gridline mb-4 flex items-center justify-between border-b border-white/8 pb-4">
                <div>
                  <h3 className="theme-section-title text-lg font-semibold text-white">
                    {setupMode === "server" ? "Add Server" : "Add Cloud Audit Trail"}
                  </h3>
                  <p className="theme-section-copy mt-1 text-sm text-zinc-400">
                    {setupMode === "server"
                      ? "Configure host, port, and credentials for direct log ingestion."
                      : "Connect a cloud audit source and preserve every event with blockchain-backed integrity."}
                  </p>
                </div>
                {setupMode === "server" ? (
                  <Server className="h-5 w-5 text-sky-300" />
                ) : (
                  <Cloud className="h-5 w-5 text-sky-300" />
                )}
              </div>

              <div className="grid gap-4">
                {setupFields[setupMode].map((field) => (
                  <SetupField key={field.label} {...field} />
                ))}
              </div>

              <button className="theme-primary-button mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 sm:w-auto">
                Save source
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="theme-panel rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#0a1218_0%,#080c12_100%)] p-5">
              <div className="theme-gridline mb-4 flex items-center justify-between border-b border-white/8 pb-4">
                <div>
                  <h3 className="theme-section-title text-lg font-semibold text-white">
                    Top threat sources
                  </h3>
                  <p className="theme-section-copy mt-1 text-sm text-zinc-400">
                    Highest-impact IPs, identities, and environments.
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
              </div>

              <div className="space-y-3">
                {threatSources.map(([name, detail, impact], index) => (
                  <div
                    key={name}
                    className="theme-item-surface flex flex-col gap-4 rounded-[16px] border border-white/8 bg-[#091017] px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/12 text-xs font-semibold text-emerald-300">
                        {index + 1}
                      </div>
                      <div>
                        <p className="theme-section-title text-sm font-semibold text-white">{name}</p>
                        <p className="theme-section-copy mt-1 text-xs text-zinc-400">{detail}</p>
                      </div>
                    </div>
                    <span className="w-fit rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                      {impact}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="theme-panel rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#0a1218_0%,#080c12_100%)] p-5">
              <div className="theme-gridline mb-4 flex items-center justify-between border-b border-white/8 pb-4">
                <div>
                  <h3 className="theme-section-title text-lg font-semibold text-white">
                    Open alerts
                  </h3>
                  <p className="theme-section-copy mt-1 text-sm text-zinc-400">
                    Expanded analyst rows with severity, source, AI confidence, and record IDs.
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

                {openAlerts.map(([severity, time, source, type], index) => (
                  <div
                    key={`${severity}-${time}`}
                    className={`px-4 py-4 ${index < 2 ? "theme-gridline border-b border-white/6" : ""}`}
                  >
                    <div className="hidden grid-cols-[90px_100px_1fr_1.1fr] gap-3 text-sm md:grid">
                      <span className="rounded-full bg-rose-500/15 px-3 py-1 text-center font-semibold text-rose-300">
                        {severity}
                      </span>
                      <span className="theme-section-copy text-zinc-400">{time}</span>
                      <span className="theme-section-title font-medium text-white">{source}</span>
                      <span className="theme-section-copy text-zinc-300">{type}</span>
                    </div>

                    <div className="space-y-3 md:hidden">
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded-full bg-rose-500/15 px-3 py-1 text-center text-xs font-semibold text-rose-300">
                          {severity}
                        </span>
                        <span className="theme-section-copy text-sm text-zinc-400">{time}</span>
                      </div>
                      <div>
                        <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                          Source
                        </p>
                        <p className="theme-section-title mt-1 text-sm font-medium text-white">{source}</p>
                      </div>
                      <div>
                        <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                          Type
                        </p>
                        <p className="theme-section-copy mt-1 text-sm text-zinc-300">{type}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="theme-input-surface mt-4 rounded-[18px] border border-sky-500/15 bg-sky-500/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sky-300">
                  Selected alert evidence
                </p>
                <p className="theme-section-copy mt-3 text-sm text-zinc-300">
                  Raw log line:{" "}
                  <span className="theme-section-title text-white">
                    4625 | user=svc-admin | src=185.143.223.41 | 17 failed attempts in 4m
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <span className="theme-surface-muted rounded-full bg-white/[0.04] px-3 py-1 text-zinc-300">
                    AI confidence: 98.1%
                  </span>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-300">
                    Blockchain Record ID: BLX-0x8f12c1ab7e
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
