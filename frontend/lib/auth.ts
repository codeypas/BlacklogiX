export const AUTH_TOKEN_STORAGE_KEY = "blacklogix-auth-token";
export const ANALYST_STORAGE_KEY = "blacklogix-analyst";
export const AUTH_STATE_EVENT = "app:auth-change";

export type AnalystSession = {
  id: string;
  name: string;
  email: string;
  organization: string;
  avatarUrl?: string | null;
  authProvider?: string;
};

function emitAuthStateChange() {
  window.dispatchEvent(new Event(AUTH_STATE_EVENT));
}

export function getAuthToken() {
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function getAnalystSession() {
  const raw = window.localStorage.getItem(ANALYST_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AnalystSession;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}

export function setSession(token: string, analyst: AnalystSession) {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  window.localStorage.setItem(ANALYST_STORAGE_KEY, JSON.stringify(analyst));
  emitAuthStateChange();
}

export function logout() {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(ANALYST_STORAGE_KEY);
  emitAuthStateChange();
}
