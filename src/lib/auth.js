/** Session wall. The cookie is HttpOnly, so the UI only asks who is logged in. */

export const AUTH_EVENT = "af-unauthorized";

export function shouldNotifyUnauthorized(url, status) {
  if (status !== 401) return false;
  return !String(url || "").includes("/api/auth/login");
}

export function installUnauthorizedFetch() {
  if (typeof window === "undefined" || window.__afFetchPatched) return;
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await original(input, init);
    const url = typeof input === "string" ? input : input?.url;
    if (shouldNotifyUnauthorized(url, response.status)) {
      window.dispatchEvent(new Event(AUTH_EVENT));
    }
    return response;
  };
  window.__afFetchPatched = true;
}
