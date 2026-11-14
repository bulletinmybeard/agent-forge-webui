/** Add a theme: import its theme.css from index.js and append an entry. */
export const THEMES = Object.freeze([
  { id: "dark-forge", label: "Dark Forge" },
  { id: "dark-forge-bw", label: "Dark Forge bw" },
  { id: "dark-forge-orange", label: "Dark Forge Orange" },
  { id: "dark-forge-orange-v2", label: "Dark Forge Orange v2" },
]);

export const DEFAULT_THEME_ID = "dark-forge";

export function resolveThemeId(id) {
  const trimmed = id?.trim() ?? "";
  if (THEMES.some((theme) => theme.id === trimmed)) {
    return trimmed;
  }
  return DEFAULT_THEME_ID;
}
