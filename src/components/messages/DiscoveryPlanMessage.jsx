import { useState } from "react";
import { formatElapsed } from "../../lib/formatTime";

export default function DiscoveryPlanMessage({
  summary,
  total_reclaimable,
  recommendations,
  elapsed,
}) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="border border-violet-700/60 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-1.5 bg-violet-950/40 border-b border-violet-800/50 text-violet-400 text-xs font-medium flex items-center justify-between">
        <span>
          Discovery Plan — {recommendations.length} recommendation
          {recommendations.length !== 1 ? "s" : ""}
        </span>
        <span className="text-gray-500 font-normal flex items-center gap-2">
          {total_reclaimable && <span className="text-violet-400">{total_reclaimable}</span>}
          {elapsed > 0 && <span>{formatElapsed(elapsed)}</span>}
        </span>
      </div>

      {/* Summary */}
      {summary && (
        <div className="px-3 py-2 text-sm text-gray-300 border-b border-violet-800/30">
          {summary}
        </div>
      )}

      {/* Recommendations */}
      <div className="divide-y divide-violet-800/30">
        {recommendations.map((rec, i) => (
          <RecommendationRow key={i} index={i} rec={rec} />
        ))}
      </div>
    </div>
  );
}

const RecommendationRow = ({ index, rec }) => {
  const [expanded, setExpanded] = useState(false);
  const commands = rec.commands || [];

  const riskIcon =
    rec.risk === "safe" ? "✅" : rec.risk === "caution" ? "⚠️" : rec.risk === "danger" ? "🔴" : "❓";

  const _riskClass =
    rec.risk === "safe"
      ? "text-emerald-400"
      : rec.risk === "caution"
        ? "text-amber-400"
        : rec.risk === "danger"
          ? "text-red-400"
          : "text-gray-400";

  return (
    <div className="px-3 py-2">
      <div
        className="flex items-start gap-2 text-sm cursor-pointer select-none"
        onClick={() => commands.length > 0 && setExpanded(!expanded)}
      >
        <span className="text-gray-600 w-5 shrink-0 text-right">{index + 1}.</span>
        <span className="shrink-0">{riskIcon}</span>
        <div className="min-w-0 flex-1">
          <span className="text-gray-200 font-medium">{rec.area || "Unknown"}</span>
          {rec.action && <span className="text-gray-400 ml-1.5">{rec.action}</span>}
        </div>
        <div className="shrink-0 flex items-center gap-1.5 text-xs">
          {rec.size && <span className="text-violet-400 font-medium">{rec.size}</span>}
          {rec.needs_sudo && (
            <span className="px-1 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40">
              sudo
            </span>
          )}
          {commands.length > 0 && (
            <span className="text-gray-600">
              {expanded ? "▾" : "▸"} {commands.length}
            </span>
          )}
        </div>
      </div>

      {expanded && commands.length > 0 && (
        <div className="mt-1.5 ml-7 space-y-1">
          {commands.map((cmd, j) => (
            <div key={j} className="flex items-start gap-2 text-xs font-mono">
              <span className="text-gray-600 shrink-0">$</span>
              <div className="min-w-0">
                <span className="text-gray-300">{cmd.command}</span>
                {cmd.description && (
                  <span className="text-gray-600 font-sans ml-1.5">— {cmd.description}</span>
                )}
                {cmd.sudo && <span className="text-amber-500 font-sans ml-1"> (sudo)</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
