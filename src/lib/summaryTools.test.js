/**
 *   node src/lib/summaryTools.test.js
 */
import { legacyToolList, toolCountEntries } from "./summaryTools.js";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assert failed");
};

const broken = "find_files, git_diff, git_log, grep_text, read_file";

assert(toolCountEntries(broken).length === 0, "a name string is not a histogram");
assert(legacyToolList(broken) === broken, "old payload stays one line of names");
assert(legacyToolList({ read_file: 4 }) === "", "a count map is not a legacy list");

const entries = toolCountEntries({ grep_text: 2, read_file: 8, find_files: 2 });
assert(entries[0][0] === "read_file" && entries[0][1] === 8, "highest count first");
assert(entries.length === 3, "three tools");
assert(toolCountEntries(null).length === 0, "missing tools");
assert(toolCountEntries(["read_file"]).length === 0, "an array is not a count map");

console.log("summaryTools: ok");
