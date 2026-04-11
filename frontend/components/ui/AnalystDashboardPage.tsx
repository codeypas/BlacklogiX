"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Cloud,
  LoaderCircle,
  RefreshCw,
  Server,
  ShieldCheck,
  X,
} from "lucide-react";

import SiteFooter from "@/components/ui/SiteFooter";
import SiteHeader from "@/components/ui/SiteHeader";
import {
  getAlertDetail,
  createOrganization,
  createProject,
  createSource,
  getProjectOverview,
  listAlerts,
  listOrganizations,
  listProjects,
  listSources,
  type AlertDetail,
  type AlertListItem,
  type IngestionSource,
  type Organization,
  type Project,
  type ProjectOverview,
} from "@/lib/platform-api";

const threatSources = [
  ["185.143.223.41", "Brute-force login attempts", "14 alerts"],
  ["svc-backup-admin", "Privilege escalation sequence", "9 alerts"],
  ["AWS CloudTrail / us-east-1", "Unexpected data egress pattern", "6 alerts"],
  ["vpn-gateway-02", "Anomalous session timing", "4 alerts"],
] as const;

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

function titleCaseSeverity(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
  const [organizationName, setOrganizationName] = React.useState("");
  const [projectName, setProjectName] = React.useState("");
  const [sourceName, setSourceName] = React.useState("");
  const [statusValue, setStatusValue] = React.useState<IngestionSource["status"]>("ready");
  const [overview, setOverview] = React.useState<ProjectOverview | null>(null);
  const [alerts, setAlerts] = React.useState<AlertListItem[]>([]);
  const [selectedAlert, setSelectedAlert] = React.useState<AlertDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [overviewLoading, setOverviewLoading] = React.useState(false);
  const [alertsLoading, setAlertsLoading] = React.useState(false);
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
      setErrorMessage(error instanceof Error ? error.message : "Unable to load workspace");
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
      return;
    }

    let isActive = true;
    setOverviewLoading(true);
    setAlertsLoading(true);

    void Promise.all([
      getProjectOverview(selectedProjectId),
      listAlerts({ projectId: selectedProjectId, limit: 20 }),
    ])
      .then(async ([overviewResponse, alertResponse]) => {
        if (!isActive) {
          return;
        }

        setOverview(overviewResponse);
        setAlerts(alertResponse.items);

        if (alertResponse.items.length === 0) {
          setSelectedAlert(null);
          return;
        }

        const preferredAlertId = selectedAlert?.id && alertResponse.items.some((item) => item.id === selectedAlert.id)
          ? selectedAlert.id
          : alertResponse.items[0].id;

        try {
          const detail = await getAlertDetail(preferredAlertId);
          if (isActive) {
            setSelectedAlert(detail);
          }
        } catch {
          if (isActive) {
            setSelectedAlert(null);
          }
        }
      })
      .catch((error) => {
        if (isActive) {
          setOverview(null);
          setAlerts([]);
          setSelectedAlert(null);
          setErrorMessage(error instanceof Error ? error.message : "Unable to load overview");
        }
      })
      .finally(() => {
        if (isActive) {
          setOverviewLoading(false);
          setAlertsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedProjectId, selectedAlert?.id]);

  const clearMessages = () => {
    setErrorMessage("");
    setSuccessMessage("");
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
      setErrorMessage(error instanceof Error ? error.message : "Unable to create organization");
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
      setErrorMessage(error instanceof Error ? error.message : "Unable to create project");
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
      setSourceName("");
      setSuccessMessage(`${setupMode === "ai_application" ? "AI application" : "System logs"} source created successfully.`);

      const nextOverview = await getProjectOverview(selectedProjectId);
      setOverview(nextOverview);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create source");
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleSelectAlert = async (alertId: string) => {
    setErrorMessage("");
    try {
      const detail = await getAlertDetail(alertId);
      setSelectedAlert(detail);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load alert detail");
    }
  };

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
                    {organizationOptions.find((option) => option.value === selectedOrganizationId)?.label ?? "Not selected"}
                  </p>
                </div>
                <div className="theme-item-surface rounded-[16px] border border-white/8 bg-[#091017] px-4 py-3">
                  <p className="theme-faint-text text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    Project
                  </p>
                  <p className="theme-section-title mt-1 text-base font-semibold text-white">
                    {projectOptions.find((option) => option.value === selectedProjectId)?.label ?? "Not selected"}
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
                    {projectSources.find((source) => source.id === selectedSourceId)?.name ?? "Not selected"}
                  </p>
                  <p className="theme-section-copy mt-1 text-base text-zinc-400">
                    {projectSources.find((source) => source.id === selectedSourceId)
                      ? `${projectSources.find((source) => source.id === selectedSourceId)?.type} · ${projectSources.find((source) => source.id === selectedSourceId)?.status}`
                      : "Choose an existing source from the selector above."}
                  </p>
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
                    Top threat sources
                  </h3>
                  <p className="theme-section-copy mt-1 text-base text-zinc-400">
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
                        <p className="theme-section-title text-base font-semibold text-white">{name}</p>
                        <p className="theme-section-copy mt-1 text-sm text-zinc-400">{detail}</p>
                      </div>
                    </div>
                    <span className="w-fit rounded-full bg-sky-500/10 px-3 py-1 text-sm font-semibold text-sky-300">
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
                        Severity: {titleCaseSeverity(selectedAlert.severity)}
                      </span>
                      <span className="theme-surface-muted rounded-full bg-white/[0.04] px-3 py-1 text-zinc-300">
                        Score: {selectedAlert.score.toFixed(2)}
                      </span>
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-300">
                        Event ID: {selectedAlert.event_id ?? "N/A"}
                      </span>
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
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
