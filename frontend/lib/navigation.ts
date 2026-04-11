export const APP_NAVIGATION_EVENT = "app:navigate";

export function navigateTo(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new Event(APP_NAVIGATION_EVENT));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
