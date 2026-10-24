/**
 * Apply a finished chat turn from the SQLite poll onto the live message list.
 *
 * The running-state poll used to keep only confirm prompts and file diffs.
 * A chat whose WebSocket dropped agent.result stayed on the spinner until reload.
 */
import { isPlanAwaitingApproval } from "./planDocument.js";

function afterLastQuery(messages) {
  let start = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].type === "query") {
      start = i;
      break;
    }
  }
  if (start === -1) return null;
  return messages.slice(start + 1);
}

function queryText(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].type === "query") return messages[i].text || "";
  }
  return null;
}

function awaitingPlan(tail) {
  const waiting = tail.some(
    (m) => (m.type === "result" || m.type === "plan_document") && isPlanAwaitingApproval(m, m.text),
  );
  if (!waiting) return false;
  return !tail.some((m) => m.type === "summary" || m.type === "error" || m.type === "cancelled");
}

function turnSettled(tail) {
  if (tail.some((m) => m.type === "summary" || m.type === "error" || m.type === "cancelled")) {
    return true;
  }
  return tail.some(
    (m) =>
      (m.type === "result" || m.type === "plan_document") && !isPlanAwaitingApproval(m, m.text),
  );
}

/**
 * @param {Array} prev live messages
 * @param {Array} restored messages restored from the latest poll page
 * @param {(prev: Array, restored: Array) => Array} mergePassive merge (confirms, diffs)
 * @returns {{ messages: Array, done: boolean }}
 */
export function adoptPolledTurn(prev, restored, mergePassive) {
  const dbTail = afterLastQuery(restored);
  if (!dbTail || awaitingPlan(dbTail) || !turnSettled(dbTail)) {
    return { messages: mergePassive(prev, restored), done: false };
  }
  const prevQuery = queryText(prev);
  const dbQuery = queryText(restored);
  if (prevQuery !== null && dbQuery !== null && prevQuery !== dbQuery) {
    return { messages: mergePassive(prev, restored), done: false };
  }
  let cut = prev.length;
  for (let i = prev.length - 1; i >= 0; i--) {
    if (prev[i].type === "query") {
      cut = i + 1;
      break;
    }
  }
  return { messages: [...prev.slice(0, cut), ...dbTail], done: true };
}
