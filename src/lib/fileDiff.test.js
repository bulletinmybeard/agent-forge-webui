/**
 *   node src/lib/fileDiff.test.js
 */
import {
  displayFileDiffPath,
  fileDiffPresentation,
  isPendingFileDiff,
  upsertFileDiffMessage,
} from "./fileDiff.js";

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
assert(displayFileDiffPath("/Users/alice/Downloads/a.md") === "/Users/alice/Downloads/a.md");

const proposed = { type: "file_diff", action: "proposed", path: "a.py", post_hash: "" };
const receipt = { type: "file_diff", action: "written", path: "a.py", post_hash: "abc" };
const upserted = upsertFileDiffMessage([proposed], receipt);
assert(upserted.length === 1, "receipt replaces proposed");
assert(upserted[0].action === "written");
assert(upserted[0].post_hash === "abc");
assert(upsertFileDiffMessage([], proposed).length === 1);

console.log("fileDiff.test.js ok");
