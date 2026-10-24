/**
 *   node src/lib/modePicker.test.js
 */
import {
  filterModes,
  groupFor,
  groupModes,
  modeHandle,
  pushRecent,
  readRecentModeIds,
  rememberRecentMode,
} from "./modePicker.js";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assert failed");
};

const modes = [
  { id: "agent", label: "Agent", aliases: "@agent", desc: "Tool calling — files, Docker, SSH…" },
  {
    id: "chat",
    label: "Chat",
    aliases: "default — no prefix",
    desc: "General knowledge — no tools",
  },
  {
    id: "review",
    label: "Review",
    aliases: "@review",
    desc: "Parallel code review — 4 sub-agents",
  },
  { id: "coding", label: "Coding", aliases: "@coding, @code", desc: "Bulk code transforms" },
  { id: "debug", label: "Debug", aliases: "@debug", desc: "Root-cause investigation" },
  { id: "search", label: "Docs", aliases: "@docs", desc: "RAG over indexed knowledge" },
  { id: "web", label: "Search", aliases: "@search", desc: "Internet search via agent tools" },
  { id: "connector", label: "Connector", aliases: "@conn, @connector", desc: "Connected accounts" },
  { id: "gitlab", label: "Gitlab", aliases: "@gitlab", desc: "GitLab issues", connector: true },
  { id: "film", label: "Film", aliases: "@film", desc: "Movies and TV" },
  { id: "unknownbot", label: "Zebra", aliases: "@zebra", desc: "A custom agent" },
];

const ids = (list) => list.map((mode) => mode.id);

assert(modeHandle(modes[0]) === "@agent", "handle from alias");
assert(modeHandle(modes[1]) === "", "chat has no @handle");

const prefixed = filterModes(modes, "@rev");
assert(prefixed[0].id === "review", "@ prefix stripped, review wins");

const aliasHit = filterModes(modes, "code");
assert(aliasHit[0].id === "coding", "alias @code ranks as a prefix");

const descHit = filterModes(modes, "root-cause");
assert(descHit.length === 1 && descHit[0].id === "debug", "description match");

const fuzzy = filterModes(modes, "rvw");
assert(
  fuzzy.some((mode) => mode.id === "review"),
  "subsequence rvw matches review",
);

const dev = filterModes(modes, "core");
assert(
  dev.some((mode) => mode.id === "agent") && dev.some((mode) => mode.id === "chat"),
  "group name",
);

const docs = filterModes(modes, "docs");
assert(docs[0].id === "search", "@docs alias finds the Docs mode");

assert(
  groupFor(modes.find((mode) => mode.id === "search")) === "Knowledge",
  "docs id is Knowledge",
);
assert(
  groupFor(modes.find((mode) => mode.id === "web")) === "Knowledge",
  "web search is Knowledge",
);
assert(groupFor({ id: "gitlab", connector: true }) === "Connections", "known connector group");
assert(groupFor({ id: "nope", connector: true }) === "Connections", "unknown connector");
assert(groupFor({ id: "unknownbot" }) === "Custom", "unknown custom");

const groups = groupModes(modes);
assert(groups[0].label === "Core", "Core first");
assert(
  groups[0].items.map((mode) => mode.id).join(",") === "agent,chat,review",
  "core preferred order",
);
const labels = groups.map((group) => group.label);
assert(labels.at(-1) === "Custom", "Custom last");
assert(!labels.includes("Ops"), "empty groups hidden");
const custom = groups.find((group) => group.label === "Custom");
assert(custom.items[0].id === "unknownbot", "unknown lands in Custom");

assert(pushRecent(["chat", "agent"], "review").join(",") === "review,chat,agent", "push front");
assert(pushRecent(["review", "chat", "agent", "debug"], "plan").length === 4, "cap at 4");
assert(pushRecent(["review", "chat"], "chat").join(",") === "chat,review", "dedupe");
assert(pushRecent(["ok", 3, "", "x"], null).join(",") === "ok,x", "drop junk on read shape");

const mem = {
  store: {},
  getItem(key) {
    return Object.hasOwn(this.store, key) ? this.store[key] : null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
};
globalThis.localStorage = mem;
assert(readRecentModeIds().join(",") === "", "empty store");
assert(rememberRecentMode("agent").join(",") === "agent", "remember first");
assert(rememberRecentMode("review").join(",") === "review,agent", "remember second");
assert(readRecentModeIds().join(",") === "review,agent", "read back");
mem.store["agentforge:recent-modes"] = "{";
assert(readRecentModeIds().length === 0, "bad json");

assert(ids(filterModes(modes, "")).length === modes.length, "empty query keeps input order");

console.log("modePicker.test.js ok");
