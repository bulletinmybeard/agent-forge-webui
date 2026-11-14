// One notice for a chat the server would not open. The text does not say why.

export const CHAT_UNAVAILABLE = "This chat isn't available.";
export const CHAT_NOTICE_MS = 10_000;

const listeners = new Set();
let current = null;

function emit() {
  for (const listener of listeners) listener(current);
}

export function sessionGone(status) {
  return status === 404;
}

export function showChatUnavailable() {
  current = { text: CHAT_UNAVAILABLE, until: Date.now() + CHAT_NOTICE_MS };
  emit();
}

export function dismissChatNotice() {
  if (!current) return;
  current = null;
  emit();
}

export function subscribeChatNotice(listener) {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}
