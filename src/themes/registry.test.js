/**
 *   node src/themes/registry.test.js
 */
import { DEFAULT_THEME_ID, resolveThemeId, THEMES } from "./registry.js";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assert failed");
};

assert(
  THEMES.map((theme) => theme.id).join(",") ===
    "dark-forge,dark-forge-bw,dark-forge-orange,dark-forge-orange-v2",
  "theme ids",
);

assert(resolveThemeId("dark-forge-orange-v2") === "dark-forge-orange-v2", "known id");
assert(resolveThemeId("  dark-forge-bw  ") === "dark-forge-bw", "trimmed id");
assert(resolveThemeId("nope") === DEFAULT_THEME_ID, "unknown id");
assert(resolveThemeId("   ") === DEFAULT_THEME_ID, "blank id");
assert(resolveThemeId(null) === DEFAULT_THEME_ID, "null id");
assert(resolveThemeId(undefined) === DEFAULT_THEME_ID, "missing id");

console.log("registry.test.js ok");
