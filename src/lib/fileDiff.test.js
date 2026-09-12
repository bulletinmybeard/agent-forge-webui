/**
 *   node src/lib/fileDiff.test.js
 */
import { displayFileDiffPath, fileDiffPresentation, isPendingFileDiff } from "./fileDiff.js";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assert failed");
};

assert(isPendingFileDiff({ action: "proposed", post_hash: "" }), "proposed is pending");
assert(
  isPendingFileDiff({ action: "written", post_hash: "" }, { liveConfirm: true }),
  "legacy written+empty hash is pending while confirm is live",
);
assert(
  !isPendingFileDiff({ action: "written", post_hash: "" }),
  "legacy written+empty hash is not pending after reload",
);
assert(
  !isPendingFileDiff({ action: "written", post_hash: "abc" }),
  "verified written is not pending",
);
assert(
  !isPendingFileDiff({ action: "proposed", outcome: "timed_out" }),
  "timed out is not pending",
);

const pending = fileDiffPresentation({ action: "proposed", post_hash: "" });
assert(pending.pending === true, "proposed presentation is pending");
assert(pending.label === "Write?", `expected Write?, got ${pending.label}`);
assert(!pending.label.includes("Written"), "pending must not say Written");

const timed = fileDiffPresentation({ action: "proposed", outcome: "timed_out" });
assert(timed.pending === false);
assert(timed.label === "Not confirmed");

const cancelled = fileDiffPresentation({ action: "proposed", outcome: "cancelled" });
assert(cancelled.label === "Cancelled");

const written = fileDiffPresentation({ action: "written", post_hash: "deadbeef" });
assert(written.label === "Written");
assert(written.pending === false);

assert(displayFileDiffPath("~/Downloads/kogot-7-loadout.md") === "~/Downloads/kogot-7-loadout.md");
assert(displayFileDiffPath("/Users/rschulz/Downloads/a.md") === "/Users/rschulz/Downloads/a.md");

console.log("fileDiff.test.js ok");
