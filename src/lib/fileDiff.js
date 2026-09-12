/**
 * Presentation for a file.diff card.
 *
 * Pending previews use action "proposed" (or a written/edited card with no
 * post_hash, which is the pre-fix payload). Outcomes come from confirm
 * Yes/No/timeout after the preview.
 */

export function isPendingFileDiff(msg, { liveConfirm } = {}) {
  const action = msg?.action;
  const outcome = msg?.outcome;
  if (outcome) return false;
  if (action === "proposed") return true;
  const post = msg?.post_hash ?? msg?.postHash ?? "";
  // Pre-fix payloads used action=written with an empty post_hash for the
  // preview. Only treat those as pending while a confirm is actually live.
  return Boolean(liveConfirm) && (action === "written" || action === "edited") && !post;
}

export function fileDiffPresentation(msg) {
  const outcome = msg?.outcome;
  if (outcome === "timed_out") {
    return {
      label: "Not confirmed",
      badge: "text-amber-400",
      border: "border-l-amber-500/60",
      pending: false,
    };
  }
  if (outcome === "cancelled" || outcome === "denied") {
    return {
      label: "Cancelled",
      badge: "text-red-400",
      border: "border-l-red-500/60",
      pending: false,
    };
  }
  if (outcome === "confirmed" || (msg?.action === "written" && msg?.post_hash)) {
    return {
      label: "Written",
      badge: "text-emerald-400",
      border: "border-l-emerald-500/60",
      pending: false,
    };
  }
  if (isPendingFileDiff(msg)) {
    return {
      label: "Write?",
      badge: "text-amber-400",
      border: "border-l-amber-500/60",
      pending: true,
    };
  }
  switch (msg?.action) {
    case "reverted":
      return {
        label: "Reverted",
        badge: "text-amber-400",
        border: "border-l-amber-500/60",
        pending: false,
      };
    case "written":
      return {
        label: "Written",
        badge: "text-emerald-400",
        border: "border-l-emerald-500/60",
        pending: false,
      };
    case "compared":
      return {
        label: "Compared",
        badge: "text-violet-400",
        border: "border-l-violet-500/60",
        pending: false,
      };
    default:
      return {
        label: "Edited",
        badge: "text-sky-400",
        border: "border-l-sky-500/60",
        pending: false,
      };
  }
}

export function displayFileDiffPath(path) {
  if (!path) return "";
  return path;
}
