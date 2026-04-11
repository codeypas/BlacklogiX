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
  api_key_prefix: string | null;
  last_key_rotated_at: string | null;
  plain_api_key?: string | null;
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

export type EventListItem = {
  id: string;
  kind: "ai" | "system";
  project_id: string;
  source_id: string;
  source_name: string;
  source_type: string;
  timestamp: string;
  event_type: string | null;
  service: string | null;
  level: string | null;
  model_name: string | null;
  model_version: string | null;
  confidence_score: number | null;
  actor_id: string | null;
  hash_algorithm: string | null;
  raw_hash: string | null;
  previous_hash: string | null;
  chain_hash: string | null;
};

export type EventDetail = EventListItem & {
  prompt: string | null;
  response: string | null;
  metadata: Record<string, unknown>;
  raw_payload: Record<string, unknown>;
};

export type EventListResponse = {
  items: EventListItem[];
  total_returned: number;
};

export type ChatSession = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  context_json: Record<string, unknown>;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export type ChatMessageResponse = {
  session_id: string;
  session_title: string;
  user_message: ChatMessage;
  assistant_message: ChatMessage;
};

export type ProjectAuditReport = {
  project_id: string;
  project_name: string;
  generated_at: string;
  summary: string;
  reporting_window: string;
  total_events: number;
  ai_events: number;
  system_events: number;
  total_alerts: number;
  open_alerts: number;
  critical_alerts: number;
  verified_events: number;
  invalid_events: number;
  integrity_score_percent: number;
  ready_sources: number;
  connected_sources: number;
  paused_sources: number;
  source_count: number;
  source_summaries: Array<{
    source_id: string;
    source_name: string;
    source_type: string;
    status: string;
    api_key_prefix: string | null;
    last_key_rotated_at: string | null;
  }>;
  recent_events: Array<{
    event_id: string;
    kind: string;
    source_name: string;
    timestamp: string;
    label: string;
    actor_id: string | null;
    chain_hash: string | null;
  }>;
  recent_alerts: Array<{
    alert_id: string;
    title: string;
    severity: string;
    status: string;
    source_name: string;
    score: number;
    created_at: string;
  }>;
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

export function rotateSourceApiKey(sourceId: string) {
  return apiRequest<IngestionSource>(`/sources/${sourceId}/rotate-key`, {
    method: "POST",
  });
}

export function getProjectOverview(projectId: string) {
  return apiRequest<ProjectOverview>(`/overview/${projectId}`);
}

export function getProjectAuditReport(projectId: string) {
  return apiRequest<ProjectAuditReport>(`/reports/project/${projectId}`);
}

export function createChatSession(input?: {
  title?: string;
  projectId?: string;
  alertId?: string;
  eventId?: string;
}) {
  return apiRequest<ChatSession>("/chat/session", {
    method: "POST",
    body: JSON.stringify({
      title: input?.title,
      project_id: input?.projectId,
      alert_id: input?.alertId,
      event_id: input?.eventId,
    }),
  });
}

export function sendChatMessage(input: { sessionId: string; message: string }) {
  return apiRequest<ChatMessageResponse>("/chat/message", {
    method: "POST",
    body: JSON.stringify({
      session_id: input.sessionId,
      message: input.message,
    }),
  });
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

export function acknowledgeAlert(alertId: string) {
  return apiRequest<AlertDetail>(`/alerts/${alertId}/acknowledge`, {
    method: "POST",
  });
}

export function resolveAlert(alertId: string) {
  return apiRequest<AlertDetail>(`/alerts/${alertId}/resolve`, {
    method: "POST",
  });
}

export function listEvents(input?: {
  projectId?: string;
  sourceId?: string;
  kind?: EventListItem["kind"];
  eventType?: string;
  actorId?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();

  if (input?.projectId) {
    params.set("project_id", input.projectId);
  }
  if (input?.sourceId) {
    params.set("source_id", input.sourceId);
  }
  if (input?.kind) {
    params.set("kind", input.kind);
  }
  if (input?.eventType) {
    params.set("event_type", input.eventType);
  }
  if (input?.actorId) {
    params.set("actor_id", input.actorId);
  }
  if (input?.limit) {
    params.set("limit", String(input.limit));
  }

  const query = params.toString();
  return apiRequest<EventListResponse>(`/events${query ? `?${query}` : ""}`);
}

export function getEventDetail(eventId: string) {
  return apiRequest<EventDetail>(`/events/${eventId}`);
}
