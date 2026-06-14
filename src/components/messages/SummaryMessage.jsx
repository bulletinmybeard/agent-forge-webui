import { useMemo } from "react";
import { formatElapsed } from "../../lib/formatTime";

const formatTsTime = (ts) => {
  if (!ts) return "";
  const epoch = parseInt(ts.split("-")[0], 10);
  if (!epoch || Number.isNaN(epoch)) return "";
  const d = new Date(epoch);
  const date = d.toLocaleDateString([], { year: "numeric", month: "2-digit", day: "2-digit" });
  const time = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${date} ${time}`;
};

const RERUNNABLE_TOOLS = new Set(["test_runner", "k6_load_test", "health_check"]);

export default function SummaryMessage({
  iterations,
  elapsed,
  toolCalls,
  tools,
  models,
  _ts,
  onRerun,
}) {
  const toolEntries = Object.entries(tools || {}).sort(([, a], [, b]) => b - a);
  const timeStr = useMemo(() => formatTsTime(_ts), [_ts]);
  const showRerun = onRerun && Object.keys(tools || {}).some((t) => RERUNNABLE_TOOLS.has(t));

  return (
    <div className="px-3 py-2 text-xs text-gray-500 space-y-1">
      <div className="flex items-center gap-6">
        <span>Iterations: {iterations}</span>
        <span>
          Time: {formatElapsed(elapsed)}
          {timeStr && (
            <span className="text-gray-600 ml-1 font-mono tabular-nums">({timeStr})</span>
          )}
        </span>
        <span>Tool calls: {toolCalls}</span>
        {showRerun && (
          <button
            type="button"
            onClick={onRerun}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
                       text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20
                       border border-indigo-500/20 hover:border-indigo-500/30 transition-colors"
            title="Re-run the same query"
          >
            <svg
              className="w-3 h-3"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 4v4h4" />
              <path d="M3.51 10a5.5 5.5 0 1 0 .68-5.97L1 8" />
            </svg>
            Re-run
          </button>
        )}
      </div>
      {toolEntries.length > 0 && (
        <div className="flex gap-4">
          {toolEntries.map(([name, count]) => (
            <span key={name} className="text-gray-600">
              {name} {count}x
            </span>
          ))}
        </div>
      )}
      {Array.isArray(models) && models.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-gray-600">
          <span className="text-gray-500">Models:</span>
          {models.map((m, i) => (
            <span key={`${m}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-600">→</span>}
              <span className="font-mono">{m}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
