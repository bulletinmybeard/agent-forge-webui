import { resolveThemeId } from "../themes/registry";

export const THEME_STORAGE_KEY = "agentforge:theme";

export function readStoredThemeId() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function applyTheme(id) {
  const resolved = resolveThemeId(id);
  document.documentElement.dataset.theme = resolved;
  return resolved;
}

export function persistTheme(id) {
  const resolved = applyTheme(id);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, resolved);
  } catch {
    /* private mode or blocked storage */
  }
  return resolved;
}

export function applyStoredTheme() {
  return applyTheme(readStoredThemeId());
}
