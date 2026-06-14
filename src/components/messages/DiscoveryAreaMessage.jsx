import { formatElapsed } from "../../lib/formatTime";

export default function DiscoveryAreaMessage({ areas, maxRounds }) {
  if (!areas || Object.keys(areas).length === 0) return null;

  const entries = Object.entries(areas);
  const doneCount = entries.filter(([, a]) => a.status === "done").length;
  const total = entries.length;

  return (
    <div className="border border-violet-700/60 rounded-lg overflow-hidden">
      <div className="px-3 py-1.5 bg-violet-950/40 border-b border-violet-800/50 text-violet-400 text-xs font-medium flex items-center justify-between">
        <span>
          Investigating {total} area{total !== 1 ? "s" : ""}
          {doneCount > 0 && doneCount < total && ` — ${doneCount}/${total} done`}
          {doneCount === total && " — all done"}
        </span>
      </div>
      <div className="px-3 py-2 space-y-1">
        {entries.map(([areaId, area]) => (
          <AreaRow key={areaId} areaId={areaId} area={area} maxRounds={maxRounds || 3} />
        ))}
      </div>
    </div>
  );
}

const AreaRow = ({ area, maxRounds }) => {
  const statusIcon =
    area.status === "done"
      ? "✓"
      : area.status === "error"
        ? "✗"
        : area.status === "analysing"
          ? "◎"
          : "●";

  const statusClass =
    area.status === "done"
      ? "text-emerald-400"
      : area.status === "error"
        ? "text-red-400"
        : area.status === "analysing"
          ? "text-amber-400"
          : "text-sky-400";

  const animateClass =
    area.status === "running" || area.status === "analysing" ? "animate-pulse" : "";

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-4 text-center ${statusClass} ${animateClass}`}>{statusIcon}</span>
      <span className="text-gray-200 font-medium min-w-0 truncate">{area.label}</span>

      {/* Round indicator. Show X/Y while running */}
      {area.status !== "done" && area.round > 0 && (
        <span className="text-gray-600 text-xs">
          round {area.round}/{maxRounds}
        </span>
      )}

      {/* Done summary. Show completed rounds/max */}
      {area.status === "done" && (
        <span className="text-gray-500 text-xs ml-auto shrink-0">
          {area.totalSize && <span className="text-violet-400 mr-1.5">{area.totalSize}</span>}
          {area.maxRounds > 0 && `${area.maxRounds}/${maxRounds}r`}
          {area.elapsed > 0 && ` ${formatElapsed(area.elapsed)}`}
        </span>
      )}

      {/* Error */}
      {area.status === "error" && area.errors?.length > 0 && (
        <span className="text-red-500 text-xs ml-auto truncate max-w-[200px]">
          {area.errors[0]}
        </span>
      )}

      {/* Command counter for running areas */}
      {(area.status === "running" || area.status === "analysing") && area.commands > 0 && (
        <span className="text-gray-600 text-xs ml-auto">
          {area.commands} cmd{area.commands !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
};
