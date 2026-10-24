// Run-footer tool histogram. `tools` is a name → count map.
// Older @review / @research summaries stored a comma-separated string.
// Object.entries() on that string walks characters ("0 fx", "1 ix", ...).

export function toolCountEntries(tools) {
  if (!tools || typeof tools !== "object" || Array.isArray(tools)) return [];
  return Object.entries(tools)
    .filter(([, count]) => typeof count === "number")
    .sort(([, a], [, b]) => b - a);
}

export function legacyToolList(tools) {
  return typeof tools === "string" ? tools.trim() : "";
}
