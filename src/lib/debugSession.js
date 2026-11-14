// agentforgedebug://<session-id> — the id is the host. A path or query does nothing.

const SESSION_HOST = /^[0-9A-Za-z](?:[0-9A-Za-z-]{0,126}[0-9A-Za-z])?$/;

export function debugSessionUrl(sessionId) {
  if (typeof sessionId !== "string") return null;
  const id = sessionId.trim();
  if (!SESSION_HOST.test(id)) return null;
  return `agentforgedebug://${id}`;
}
