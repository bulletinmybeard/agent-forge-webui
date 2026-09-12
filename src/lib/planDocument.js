/**
 * Parse @plan markdown (frontmatter + ### T1 — tasks) for the plan card.
 */

const TASK_RE = /^###\s+(T\d+)\s*[—\-–:]\s*(.+)$/gm;
const FILES_RE = /^\s*[-*]\s*Files?:\s*(.+)$/im;
const GOAL_RE = /\*\*Goal:\*\*\s*(.+)/i;

export function isPlanDocumentResult(meta, text) {
  if (meta?.plan_path) return true;
  const body = text || "";
  if (body.startsWith("# Build recap")) return true;
  if (body.startsWith("---") && /status:\s*(draft|approved|building|done|cancelled)/i.test(body)) {
    return true;
  }
  return false;
}

export function parsePlanDocument(text) {
  const raw = text || "";
  const kind = raw.startsWith("# Build recap") ? "build" : "plan";
  let rest = raw;
  const meta = {};
  if (rest.startsWith("---")) {
    const end = rest.indexOf("\n---", 3);
    if (end !== -1) {
      const fm = rest.slice(4, end);
      for (const line of fm.split("\n")) {
        const i = line.indexOf(":");
        if (i === -1) continue;
        meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      }
      rest = rest.slice(end + 4).replace(/^\n/, "");
    }
  }

  const goalMatch = rest.match(GOAL_RE);
  const tasks = [];
  const matches = [...rest.matchAll(TASK_RE)];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : rest.length;
    const chunk = rest.slice(start, end);
    const filesMatch = chunk.match(FILES_RE);
    const files = filesMatch
      ? filesMatch[1]
          .split(/[,;]/)
          .map((p) => p.trim().replace(/^`|`$/g, ""))
          .filter(Boolean)
      : [];
    tasks.push({
      id: matches[i][1],
      title: matches[i][2].trim(),
      files,
    });
  }

  return {
    kind,
    status: meta.status || (kind === "build" ? "done" : "draft"),
    target: meta.target || "",
    branch: meta.branch || "",
    created: meta.created || "",
    goal: goalMatch ? goalMatch[1].trim() : "",
    tasks,
    body: rest.trim(),
  };
}
