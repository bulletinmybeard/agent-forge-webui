import { useEffect, useRef } from "react";

// How long the conversation must sit untouched before a recap is requested.
// export const RECAP_IDLE_MS = 180000; // 3 min
export const RECAP_IDLE_MS = 60000; // 1 min

// Complete user -> assistant exchanges required before a recap fires. 3 means
// three prompts that each got an answer; two back-and-forths won't trigger one.
// Counted since the last recap, so the gate keeps applying to every later recap
// rather than only the first.
export const RECAP_MESSAGE_THRESHOLD = 3;

/**
 * Count complete exchanges since the most recent recap.
 *
 * A prompt still awaiting its answer doesn't count, hence the min() of the two
 * tallies. If the last recap has scrolled out of the loaded page the count comes
 * out too high, which is harmless: the backend owns the real watermark and
 * answers `created: false` when there is nothing new.
 */
export const exchangesSinceRecap = (messages) => {
  let queries = 0;
  let results = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const type = messages[i]?.type;
    if (type === "recap") break;
    if (type === "query") queries++;
    else if (type === "result") results++;
  }
  return Math.min(queries, results);
};

/**
 * Request a recap once the conversation has gone quiet.
 *
 * Two gates: RECAP_MESSAGE_THRESHOLD complete exchanges must have happened since
 * the last recap, and the conversation must then sit idle for RECAP_IDLE_MS. Below
 * the threshold no timer is armed at all.
 *
 * The timer is re-armed from scratch whenever anything changes — a new message,
 * a run starting, a pending confirm/secret prompt — so it only ever fires after
 * a genuine idle stretch following an assistant response.
 *
 * The endpoint is incremental and no-ops when nothing new exists, so an extra
 * fire is harmless; we still skip re-arming when the last message is already a
 * recap, to avoid a pointless request every interval while the tab sits open.
 */
export default function useRecap({ sessionId, running, messages, confirm, secret, onRecap }) {
  const timerRef = useRef(null);

  const last = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastTs = last?._ts ?? null;
  const lastIsRecap = last?.type === "recap";
  const exchanges = exchangesSinceRecap(messages);
  const enoughExchanges = exchanges >= Math.max(1, RECAP_MESSAGE_THRESHOLD);
  const blocked = running || !!confirm || !!secret;

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!sessionId || blocked || !enoughExchanges || !lastTs || lastIsRecap) return;

    let cancelled = false;
    timerRef.current = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/sessions/${sessionId}/recap`, { method: "POST" });
        if (!resp.ok) return;
        const data = await resp.json();
        if (!cancelled && data?.created && data.recap) {
          onRecap(data.recap, data);
        }
      } catch {
        // A recap is chrome — a failure must never surface into the chat.
      }
    }, RECAP_IDLE_MS);

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [sessionId, blocked, enoughExchanges, lastTs, lastIsRecap, onRecap]);
}
