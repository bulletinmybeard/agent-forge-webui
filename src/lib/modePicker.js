// Mode picker search, grouping, and the recent-mode list (localStorage only).

const RECENT_KEY = "agentforge:recent-modes";
const RECENT_LIMIT = 4;

// Preferred order inside each group. Ids missing here are appended after,
// connectors into Connections and everything else into Custom.
const GROUPS = [
  ["Core", ["agent", "chat", "plan", "research", "review", "discover"]],
  [
    "Dev",
    [
      "api",
      "build",
      "coding",
      "debug",
      "test",
      "docker",
      "sql",
      "pipeline",
      "snippets",
      "intellij",
    ],
  ],
  ["Ops", ["cloud", "logs", "monitor", "perf", "health", "scheduler", "security"]],
  ["Knowledge", ["search", "kb", "notes", "web"]],
  ["Personal", ["film", "trip", "felix"]],
  // Filled from custom agent `group`, not a hardcoded id list.
  ["Models", []],
  ["Connections", ["connector", "gitlab", "github"]],
  ["Custom", []],
];

// custom agent `group` → popover section. test_models keeps the Models header.
// Any other token becomes its own section, so a new group does not need a UI change.
const AGENT_GROUP_LABEL = {
  test_models: "Models",
};

const labelForAgentGroup = (group) => {
  if (typeof group !== "string" || !group.trim()) return "";
  const key = group.trim();
  if (AGENT_GROUP_LABEL[key]) return AGENT_GROUP_LABEL[key];
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const GROUP_ORDER = GROUPS.map(([name]) => name);

const GROUP_BY_ID = new Map();
const ORDER_BY_ID = new Map();
for (const [name, ids] of GROUPS) {
  ids.forEach((id, index) => {
    GROUP_BY_ID.set(id, name);
    ORDER_BY_ID.set(id, index);
  });
}

export const groupFor = (mode) => {
  if (!mode) return "Custom";
  const fromAgent = labelForAgentGroup(mode.group);
  if (fromAgent) return fromAgent;
  return GROUP_BY_ID.get(mode.id) || (mode.connector ? "Connections" : "Custom");
};

export const modeHandle = (mode) => (mode?.aliases || "").match(/@\w+/)?.[0] || "";

const aliasTokens = (mode) => {
  const tokens = (mode?.aliases || "").match(/@(\w+)/g) || [];
  return tokens.map((token) => token.slice(1).toLowerCase());
};

const isSubsequence = (text, query) => {
  let i = 0;
  for (const ch of text) {
    if (ch === query[i]) i += 1;
    if (i === query.length) return true;
  }
  return false;
};

// 0 alias/id prefix, 1 name prefix, 2 contains or group prefix, 3 description, 4 fuzzy.
const matchScore = (mode, query) => {
  const id = (mode.id || "").toLowerCase();
  const name = (mode.label || "").toLowerCase();
  const group = groupFor(mode).toLowerCase();
  const desc = (mode.desc || "").toLowerCase();
  const aliases = aliasTokens(mode);

  if (id.startsWith(query) || aliases.some((alias) => alias.startsWith(query))) return 0;
  if (name.startsWith(query)) return 1;
  if (
    id.includes(query) ||
    name.includes(query) ||
    aliases.some((alias) => alias.includes(query)) ||
    group.startsWith(query)
  ) {
    return 2;
  }
  if (desc.includes(query)) return 3;
  if (query.length < 2) return -1;
  if (
    isSubsequence(id, query) ||
    isSubsequence(name, query) ||
    aliases.some((alias) => isSubsequence(alias, query))
  ) {
    return 4;
  }
  return -1;
};

export const filterModes = (modes, query) => {
  const q = (query || "").toLowerCase().replace(/^@/, "").trim();
  if (!q) return modes;
  return modes
    .map((mode) => ({ mode, score: matchScore(mode, q) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => a.score - b.score)
    .map((entry) => entry.mode);
};

export const groupModes = (modes) => {
  const index = new Map(modes.map((mode, i) => [mode.id, i]));
  const buckets = new Map(GROUP_ORDER.map((name) => [name, []]));
  for (const mode of modes) {
    const name = groupFor(mode);
    if (!buckets.has(name)) {
      const custom = buckets.get("Custom");
      buckets.delete("Custom");
      buckets.set(name, []);
      if (custom) buckets.set("Custom", custom);
    }
    buckets.get(name).push(mode);
  }
  const groups = [];
  for (const name of buckets.keys()) {
    const items = buckets.get(name);
    if (items.length === 0) continue;
    items.sort((a, b) => {
      const ai = ORDER_BY_ID.has(a.id) ? ORDER_BY_ID.get(a.id) : 1000;
      const bi = ORDER_BY_ID.has(b.id) ? ORDER_BY_ID.get(b.id) : 1000;
      if (ai !== bi) return ai - bi;
      // Models has no preferred ids. Keep the order /api/agents returned.
      if (name === "Models") return (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0);
      return (a.label || "").localeCompare(b.label || "");
    });
    groups.push({ label: name, items });
  }
  return groups;
};

export const pushRecent = (ids, id, limit = RECENT_LIMIT) => {
  if (!id) return (ids || []).filter((item) => typeof item === "string" && item).slice(0, limit);
  const prev = Array.isArray(ids) ? ids : [];
  return [id, ...prev.filter((item) => item !== id && typeof item === "string" && item)].slice(
    0,
    limit,
  );
};

export const readRecentModeIds = () => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return pushRecent(parsed, null);
  } catch {
    return [];
  }
};

export const rememberRecentMode = (id) => {
  const next = pushRecent(readRecentModeIds(), id);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
  return next;
};
