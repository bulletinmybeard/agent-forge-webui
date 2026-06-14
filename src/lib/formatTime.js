/**
 * Format elapsed seconds into a human-friendly string.
 *
 * - Under 1 minute:  "12.3s"
 * - 1–59 minutes:    "2m 7.8s"
 * - 60+ minutes:     "1h 3m 12s"
 *
 * @param {number} seconds — elapsed time in seconds
 * @returns {string} formatted duration
 */
export const formatElapsed = (seconds) => {
  if (seconds == null || seconds < 0) return "";

  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s >= 0.05 ? `${m}m ${s.toFixed(1)}s` : `${m}m`;
  }

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  const parts = [`${h}h`];
  if (m > 0) parts.push(`${m}m`);
  if (s > 0) parts.push(`${s}s`);
  return parts.join(" ");
};
