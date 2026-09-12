/**
 *   node src/lib/planDocument.test.js
 */
import { isPlanDocumentResult, parsePlanDocument } from "./planDocument.js";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assert failed");
};

const md = `---
status: draft
target: /repo
branch: feat
created: 2026-09-11-12-14
---

# Plan

**Goal:** Add LACP for UNIs

## Tasks

### T1 — Alias field
- Files: \`uni_v1.py\`

### T2 — Tests
- Files: \`test_uni.py\`, \`uni_v1.py\`
`;

assert(isPlanDocumentResult({ plan_path: "/tmp/p.md" }, "hi"), "plan_path is a plan");
assert(isPlanDocumentResult({}, md), "frontmatter draft is a plan");
assert(!isPlanDocumentResult({}, "just a normal answer"), "plain result is not a plan");

const parsed = parsePlanDocument(md);
assert(parsed.status === "draft", "status");
assert(parsed.target === "/repo", "target");
assert(parsed.goal === "Add LACP for UNIs", "goal");
assert(parsed.tasks.length === 2, "two tasks");
assert(parsed.tasks[0].id === "T1", "T1 id");
assert(parsed.tasks[1].files.join(",") === "test_uni.py,uni_v1.py", "T2 files");

const recap = parsePlanDocument("# Build recap\n\nDone.\n");
assert(recap.kind === "build", "build recap kind");

console.log("planDocument.test.js ok");
