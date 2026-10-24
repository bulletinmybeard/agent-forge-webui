/**
 *   node src/lib/polledTurn.test.js
 */
import { adoptPolledTurn } from "./polledTurn.js";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assert failed");
};

const passthrough = (prev) => prev;

const prev = [
  { type: "query", text: "earlier" },
  { type: "result", text: "old answer" },
  { type: "query", text: "cup sizes" },
  { type: "routing" },
];

const restored = [
  { type: "query", text: "cup sizes" },
  { type: "routing" },
  { type: "config", model: "kimi-k3:cloud" },
  { type: "result", text: "shape matters" },
  { type: "summary", iterations: 1, elapsed: 9.8 },
];

const adopted = adoptPolledTurn(prev, restored, passthrough);
assert(adopted.done, "finished chat clears the run");
assert(adopted.messages[0].text === "earlier", "older turns stay");
assert(adopted.messages.at(-1).type === "summary", "summary is applied");
assert(
  adopted.messages.some((m) => m.text === "shape matters"),
  "result is applied",
);
assert(adopted.messages.filter((m) => m.type === "routing").length === 1, "stale tail replaced");
assert(
  adopted.messages.some((m) => m.type === "config"),
  "config from the db turn is kept",
);

const stillRunning = adoptPolledTurn(
  prev,
  [
    { type: "query", text: "cup sizes" },
    { type: "routing" },
    { type: "config", model: "kimi-k3:cloud" },
  ],
  (p) => p,
);
assert(!stillRunning.done, "config-only turn stays running");
assert(stillRunning.messages === prev, "unfinished poll does not replace the list");

const plan = adoptPolledTurn(
  [{ type: "query", text: "plan it" }],
  [
    { type: "query", text: "plan it" },
    {
      type: "plan_document",
      text: "---\nstatus: draft\n---\n# Plan\n\n**Goal:** x\n",
    },
  ],
  (p) => p,
);
assert(!plan.done, "draft plan still waits for approval");

const otherQuery = adoptPolledTurn(
  [{ type: "query", text: "mine" }],
  [
    { type: "query", text: "theirs" },
    { type: "result", text: "nope" },
    { type: "summary", elapsed: 1 },
  ],
  (p) => [...p, { type: "confirm_prompt", requestId: "c1" }],
);
assert(!otherQuery.done, "a different query is not this turn");
assert(otherQuery.messages.at(-1).requestId === "c1", "passive merge still runs");

console.log("polledTurn.test.js ok");
