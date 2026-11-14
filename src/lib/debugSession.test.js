/**
 *   node src/lib/debugSession.test.js
 */
import { debugSessionUrl } from "./debugSession.js";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assert failed");
};

const id = "01a0759e-f96d-726e-a6d2-f6bf13522ed3";

assert(debugSessionUrl(id) === `agentforgedebug://${id}`, "uuid is the host");
assert(debugSessionUrl(`  ${id}  `) === `agentforgedebug://${id}`, "trim");
assert(
  debugSessionUrl("0123456789abcdef0123456789abcdef") ===
    "agentforgedebug://0123456789abcdef0123456789abcdef",
  "hex id",
);
assert(debugSessionUrl(`${id}?x=1`) === null, "query is not a host");
assert(debugSessionUrl(`${id}/extra`) === null, "path is not a host");
assert(debugSessionUrl("") === null, "empty");
assert(debugSessionUrl("   ") === null, "blank");
assert(debugSessionUrl(null) === null, "null");
assert(debugSessionUrl(undefined) === null, "missing");

console.log("debugSession: ok");
