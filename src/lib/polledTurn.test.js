/**
 *   TZ=Europe/Amsterdam node src/lib/polledTurn.test.js
 */
import { adoptPolledTurn, messageEpoch } from "./polledTurn.js";

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

const sentAt = 1_700_000_000_000;
const prefixed = adoptPolledTurn(
  [{ type: "query", text: "@cloud Check my #putio for one of the Mortal Kombat movies" }],
  [
    {
      type: "query",
      text: "Check my #putio for one of the Mortal Kombat movies",
      _ts: `${sentAt + 2000}-1`,
    },
    { type: "result", text: "none", _ts: `${sentAt + 3000}-2` },
    { type: "summary", elapsed: 4, _ts: `${sentAt + 4000}-3` },
  ],
  passthrough,
  { since: sentAt },
);
assert(prefixed.done, "mode prefix on the bubble is the same turn");
assert(prefixed.messages[0].text.startsWith("@cloud"), "the typed bubble stays");
assert(prefixed.messages.at(-1).type === "summary", "prefixed turn adopts the tail");

const stale = adoptPolledTurn(
  [{ type: "query", text: "@film cup sizes" }],
  [
    { type: "query", text: "cup sizes", _ts: `${sentAt - 60_000}-1` },
    { type: "result", text: "old", _ts: `${sentAt - 50_000}-2` },
    { type: "summary", elapsed: 1, _ts: `${sentAt - 40_000}-3` },
  ],
  passthrough,
  { since: sentAt },
);
assert(!stale.done, "a settled row from before this send is not this turn");

const otherPrefixed = adoptPolledTurn(
  [{ type: "query", text: "@film mine" }],
  [
    { type: "query", text: "theirs", _ts: `${sentAt + 1000}-1` },
    { type: "result", text: "nope", _ts: `${sentAt + 2000}-2` },
    { type: "summary", elapsed: 1, _ts: `${sentAt + 3000}-3` },
  ],
  passthrough,
  { since: sentAt },
);
assert(!otherPrefixed.done, "a prefixed bubble does not adopt a different prompt");

// Session 01a1adb4: SQLite wall time is container UTC, with no offset.
// A CET browser used to read that as local and reject the finished follow-up.
const naive = "2026-11-05 21:55:14.869";
const at = messageEpoch(naive);
const utc = Date.UTC(2026, 10, 5, 21, 55, 14, 869);
assert(at === utc, `naive chat time is utc, got ${at}`);
assert(messageEpoch("2026-11-05T21:55:14.869") === utc, "T form is utc");
assert(messageEpoch("2026-11-05T21:55:14.869Z") === utc, "Z is utc");
assert(messageEpoch("2026-11-05T21:55:14.869+00:00") === utc, "offset kept");
assert(
  messageEpoch("2026-11-05T21:55:14.869000+00:00") === utc,
  "python microseconds stay on the same instant",
);
assert(
  messageEpoch("2026-11-05T21:55:14.869+01:00") === utc - 3_600_000,
  "non-utc offset is not rewritten",
);
assert(Number.isNaN(messageEpoch(null)), "missing time");
assert(Number.isNaN(messageEpoch("")), "blank time");

const sentAtFollow = at + 30;
const followUp = adoptPolledTurn(
  [{ type: "query", text: "Empty this list", _ts: `${sentAtFollow}-1` }],
  [
    { type: "query", text: "Empty this list", _ts: `${at}-1` },
    { type: "result", text: "done", _ts: `${at + 10000}-2` },
    { type: "summary", elapsed: 10, _ts: `${at + 10000}-3` },
  ],
  passthrough,
  { since: sentAtFollow },
);
assert(followUp.done, "finished follow-up clears the spinner");
assert(
  followUp.messages.some((m) => m.text === "done"),
  "result is shown",
);

const asLocal = new Date(naive.replace(" ", "T")).getTime();
if (asLocal !== utc) {
  const stuck = adoptPolledTurn(
    [{ type: "query", text: "Empty this list", _ts: `${sentAtFollow}-1` }],
    [
      { type: "query", text: "Empty this list", _ts: `${asLocal}-1` },
      { type: "result", text: "done", _ts: `${asLocal + 10000}-2` },
      { type: "summary", elapsed: 10, _ts: `${asLocal + 10000}-3` },
    ],
    passthrough,
    { since: sentAtFollow },
  );
  assert(!stuck.done, "browser-local parse of a utc stamp stays on the spinner");
}

console.log("polledTurn.test.js ok");
