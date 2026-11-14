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

function lastQuery(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].type === "query") return messages[i];
  }
  return null;
}

function queryText(messages) {
  const query = lastQuery(messages);
  return query ? query.text || "" : null;
}

const MODE_PREFIX = /^\s*@[\w:-]+\s+/;
const CLOCK_SKEW_MS = 15000;

function stripModePrefix(text) {
  return text.replace(MODE_PREFIX, "").trim();
}

function queriesMatch(prevQuery, dbQuery) {
  if (prevQuery === dbQuery) return true;
  const prevStripped = stripModePrefix(prevQuery);
  const dbStripped = stripModePrefix(dbQuery);
  return prevStripped.length > 0 && prevStripped === dbStripped;
}

function queryTime(message) {
  if (!message || message._ts == null) return null;
  const ms = Number(String(message._ts).split("-")[0]);
  return Number.isFinite(ms) ? ms : null;
}

// SQLite stores a naive timestamp. The chat API now sends an offset; older
// payloads do not. Those are container UTC. Parsing them as the browser's
// local time makes a finished follow-up look an hour old, so the poller
// never clears "Agent is working...".
export function messageEpoch(createdAt) {
  if (createdAt == null || createdAt === "") return Number.NaN;
  const raw = String(createdAt).trim();
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw);
  const iso = hasZone ? raw : `${raw.includes("T") ? raw : raw.replace(" ", "T")}Z`;
  return new Date(iso).getTime();
}

function queryIsFresh(restored, since) {
  const at = queryTime(lastQuery(restored));
  if (at === null) return true;
  return at >= since - CLOCK_SKEW_MS;
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
 * @param {{ since?: number }} [opts] client time when this send started. A settled
 *   row older than that is the previous turn (Run now, or a retry whose write
 *   has not landed yet).
 * @returns {{ messages: Array, done: boolean }}
 */
export function adoptPolledTurn(prev, restored, mergePassive, opts) {
  const dbTail = afterLastQuery(restored);
  if (!dbTail || awaitingPlan(dbTail) || !turnSettled(dbTail)) {
    return { messages: mergePassive(prev, restored), done: false };
  }
  const prevQuery = queryText(prev);
  const dbQuery = queryText(restored);
  if (prevQuery !== null && dbQuery !== null && !queriesMatch(prevQuery, dbQuery)) {
    return { messages: mergePassive(prev, restored), done: false };
  }
  const since = opts && typeof opts.since === "number" ? opts.since : null;
  if (since !== null && !queryIsFresh(restored, since)) {
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
