import { getAuthToken } from "@/lib/auth";

const platformApiUrl = import.meta.env.VITE_CHAT_API_URL ?? "http://localhost:8000";

export type Organization = {
  id: string;
  name: string;
  created_at: string;
};

export type Project = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type IngestionSource = {
  id: string;
  project_id: string;
  type: "ai_application" | "system_logs";
  name: string;
  status: "ready" | "connected" | "paused";
  created_at: string;
};

export type ProjectOverview = {
  project_id: string;
  project_name: string;
  total_events: number;
  ai_events: number;
  system_events: number;
  total_alerts: number;
  open_alerts: number;
  critical_alerts: number;
  total_sources: number;
  ready_sources: number;
  connected_sources: number;
  paused_sources: number;
  verified_events: number;
  invalid_events: number;
  integrity_score_percent: number;
  latest_event_at: string | null;
  checked_at: string;
};

export type AlertListItem = {
  id: string;
  project_id: string;
  source_id: string;
  source_name: string;
  source_type: string;
  event_kind: string;
  event_id: string | null;
  alert_type: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "acknowledged" | "resolved";
  score: number;
  created_at: string;
};

export type AlertListResponse = {
  items: AlertListItem[];
  total_returned: number;
};

export type AlertDetail = AlertListItem & {
  metadata: Record<string, unknown>;
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await fetch(`${platformApiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String(payload.detail)
        : "Request failed";
    throw new Error(detail);
  }

  return payload as T;
}

export function listOrganizations() {
  return apiRequest<Organization[]>("/organizations");
}

export function createOrganization(name: string) {
  return apiRequest<Organization>("/organizations", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function listProjects() {
  return apiRequest<Project[]>("/projects");
}

export function createProject(organizationId: string, name: string) {
  return apiRequest<Project>("/projects", {
    method: "POST",
    body: JSON.stringify({
      organization_id: organizationId,
      name,
    }),
  });
}

export function listSources() {
  return apiRequest<IngestionSource[]>("/sources");
}

export function createSource(input: {
  projectId: string;
  type: IngestionSource["type"];
  name: string;
  status?: IngestionSource["status"];
}) {
  return apiRequest<IngestionSource>("/sources", {
    method: "POST",
    body: JSON.stringify({
      project_id: input.projectId,
      type: input.type,
      name: input.name,
      status: input.status ?? "ready",
    }),
  });
}

export function getProjectOverview(projectId: string) {
  return apiRequest<ProjectOverview>(`/overview/${projectId}`);
}

export function listAlerts(input?: {
  projectId?: string;
  sourceId?: string;
  severity?: AlertListItem["severity"];
  status?: AlertListItem["status"];
  limit?: number;
}) {
  const params = new URLSearchParams();

  if (input?.projectId) {
    params.set("project_id", input.projectId);
  }
  if (input?.sourceId) {
    params.set("source_id", input.sourceId);
  }
  if (input?.severity) {
    params.set("severity", input.severity);
  }
  if (input?.status) {
    params.set("status", input.status);
  }
  if (input?.limit) {
    params.set("limit", String(input.limit));
  }

  const query = params.toString();
  return apiRequest<AlertListResponse>(`/alerts${query ? `?${query}` : ""}`);
}

export function getAlertDetail(alertId: string) {
  return apiRequest<AlertDetail>(`/alerts/${alertId}`);
}
