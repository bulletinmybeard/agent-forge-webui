import { formatElapsed } from "../../lib/formatTime";

export default function MonitorJobMessage({
  type,
  job_id,
  label,
  url,
  cron,
  cron_human,
  extraction_mode,
  css_selector,
  initial_snapshot,
  elapsed,
  status,
  diff_summary,
  lines_added,
  lines_removed,
  fields,
}) {
  if (type === "monitor.check_completed") {
    const isChanged = status === "changed";
    const isError = status === "error";
    const bgClass = isChanged
      ? "bg-amber-950/30 border-amber-800/40"
      : isError
        ? "bg-red-950/40 border-red-800/50"
        : "bg-violet-950/30 border-violet-800/40";
    const iconText = isChanged ? "🔔 Changed" : isError ? "❌ Error" : "✓ Unchanged";
    const iconColor = isChanged ? "text-amber-400" : isError ? "text-red-400" : "text-violet-400";

    return (
      <div className={`px-3 py-2 ${bgClass} rounded-lg text-sm`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`${iconColor} font-medium`}>{iconText}</span>
          <span className="text-gray-300">{label}</span>
          {elapsed != null && (
            <span className="text-gray-500 text-xs ml-auto">{formatElapsed(elapsed)}</span>
          )}
        </div>
        {diff_summary && <div className="text-gray-400 text-xs mt-1">{diff_summary}</div>}
        {isChanged && (lines_added > 0 || lines_removed > 0) && (
          <div className="flex gap-3 text-xs mt-1">
            {lines_added > 0 && <span className="text-green-400">+{lines_added}</span>}
            {lines_removed > 0 && <span className="text-red-400">-{lines_removed}</span>}
          </div>
        )}
      </div>
    );
  }

  if (type === "monitor.job_updated") {
    return (
      <div className="px-3 py-2 bg-violet-950/30 border border-violet-800/40 rounded-lg text-sm">
        <div className="flex items-center gap-2">
          <span className="text-violet-400 font-medium">✏ Monitor Updated</span>
          {elapsed != null && (
            <span className="text-gray-500 text-xs ml-auto">{formatElapsed(elapsed)}</span>
          )}
        </div>
        {fields && (
          <div className="text-gray-400 text-xs mt-1">
            Changed: {Object.keys(fields).join(", ")}
          </div>
        )}
        <div className="text-gray-600 text-xs mt-1">ID: {job_id}</div>
      </div>
    );
  }

  if (type === "monitor.job_deleted") {
    return (
      <div className="px-3 py-2 bg-red-950/30 border border-red-800/40 rounded-lg text-sm">
        <div className="flex items-center gap-2">
          <span className="text-red-400 font-medium">🗑 Monitor Deleted</span>
          <span className="text-gray-300">{label}</span>
          {elapsed != null && (
            <span className="text-gray-500 text-xs ml-auto">{formatElapsed(elapsed)}</span>
          )}
        </div>
        <div className="text-gray-600 text-xs mt-1">ID: {job_id}</div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 bg-violet-950/30 border border-violet-800/40 rounded-lg text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-violet-400 font-medium">🔍 Monitor Created</span>
        <span className="text-gray-300">{label}</span>
        {elapsed != null && (
          <span className="text-gray-500 text-xs ml-auto">in {formatElapsed(elapsed)}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs mt-1">
        <div>
          <span className="text-gray-500">Schedule</span>
          <span className="text-gray-400 ml-1.5">{cron_human || cron}</span>
        </div>
        <div>
          <span className="text-gray-500">Cron</span>
          <code className="text-gray-400 ml-1.5">{cron}</code>
        </div>
        <div>
          <span className="text-gray-500">Mode</span>
          <span className="text-gray-400 ml-1.5">{extraction_mode || "text"}</span>
        </div>
        {css_selector && (
          <div>
            <span className="text-gray-500">Selector</span>
            <code className="text-gray-400 ml-1.5">{css_selector}</code>
          </div>
        )}
      </div>

      <code className="text-violet-400/60 text-xs block mt-1 truncate">{url}</code>

      {initial_snapshot && !initial_snapshot.error && (
        <div className="text-gray-500 text-xs mt-1">
          Initial snapshot: {initial_snapshot.word_count || 0} words, hash{" "}
          {(initial_snapshot.content_hash || "").slice(0, 12)}…
        </div>
      )}
      {initial_snapshot?.error && (
        <div className="text-amber-500 text-xs mt-1">
          ⚠ Initial snapshot failed: {initial_snapshot.error}
        </div>
      )}

      {initial_snapshot?.screenshot_path &&
        (() => {
          const raw = initial_snapshot.screenshot_path;
          const rel = raw.replace(/^\/+/, "").replace(/^uploads\//, "");
          const href = `/uploads/${rel}`;
          return (
            <div className="mt-2">
              <a href={href} target="_blank" rel="noopener noreferrer">
                <img
                  src={href}
                  alt={`Screenshot of ${label || url}`}
                  className="screenshot-thumb"
                />
              </a>
            </div>
          );
        })()}

      <div className="text-gray-600 text-xs mt-1">ID: {job_id}</div>
    </div>
  );
}
