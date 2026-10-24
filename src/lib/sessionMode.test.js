/**
 *   node src/lib/sessionMode.test.js
 */
import {
  detectModeFromMessages,
  initialPickerMode,
  resolveModeId,
  sessionIdFromPath,
} from "./sessionMode.js";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assert failed");
};

const aliasToMode = {
  chat: "chat",
  agent: "agent",
  search: "search",
  web: "web",
  review: "review",
  research: "research",
  sql: "sql",
  plan: "plan",
  build: "build",
  discover: "discover",
  coding: "coding",
  felix: "felix",
  docs: "search",
};

assert(sessionIdFromPath("/chat/abc") === "abc", "session from path");
assert(sessionIdFromPath("/") === "", "new chat path");
assert(sessionIdFromPath("/chat/a%2Fb") === "a/b", "decoded session id");

assert(
  initialPickerMode({
    sessionId: "",
    promptDraft: "hello",
    modeDraft: "research",
    sessionMode: "chat",
  }) === "research",
  "unsent prompt keeps its mode",
);
assert(
  initialPickerMode({
    sessionId: "s1",
    promptDraft: "",
    modeDraft: "debug",
    sessionMode: "review",
  }) === "review",
  "empty composer uses the session mode",
);
assert(
  initialPickerMode({ sessionId: "", promptDraft: "", modeDraft: "", sessionMode: "" }) === "chat",
  "new chat defaults to chat",
);

assert(resolveModeId("web_search", aliasToMode) === "web", "web_search maps to web");
assert(resolveModeId("discovery", aliasToMode) === "discover", "discovery maps to discover");
assert(resolveModeId("custom:felix", aliasToMode) === "felix", "custom agent id");
assert(resolveModeId("@review", aliasToMode) === "review", "leading @");
assert(resolveModeId("cloud-light", aliasToMode) === null, "model profile is not a mode");

const transcript = [
  { type: "query", text: "first" },
  { type: "routed", profile: "cloud-light", reason: "@research mode — parallel web research" },
  { type: "config", mode: "research" },
  { type: "query", text: "follow up" },
  { type: "routed", profile: "sql", reason: "SQL execution mode" },
  { type: "config", mode: "web_search" },
];
assert(detectModeFromMessages(transcript, aliasToMode) === "web", "latest config mode wins");

assert(
  detectModeFromMessages(
    [{ type: "query" }, { type: "routed", profile: "review", reason: "style pass" }],
    aliasToMode,
  ) === "review",
  "routed profile used when it is a mode",
);

assert(
  detectModeFromMessages(
    [{ type: "routed", profile: "builder", reason: "build the plan" }],
    aliasToMode,
  ) === "build",
  "builder build reason",
);
assert(
  detectModeFromMessages(
    [{ type: "routed", profile: "builder", reason: "draft the plan" }],
    aliasToMode,
  ) === "plan",
  "builder defaults to plan",
);

assert(
  detectModeFromMessages([{ type: "query", text: "still routing" }], aliasToMode) === null,
  "query alone is not a mode",
);

assert(
  detectModeFromMessages(
    [{ type: "routed", profile: "cloud-light", reason: "general knowledge" }],
    aliasToMode,
  ) === null,
  "model profile alone is not a mode",
);
assert(
  detectModeFromMessages(
    [
      { type: "config", mode: "agent" },
      { type: "routed", profile: "cloud-light", reason: "general knowledge" },
    ],
    aliasToMode,
  ) === "agent",
  "model profile on a later routed card does not hide the config mode",
);

console.log("sessionMode.test.js ok");
