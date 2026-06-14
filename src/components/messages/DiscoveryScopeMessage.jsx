import { formatElapsed } from "../../lib/formatTime";

export default function DiscoveryScopeMessage({ areas, elapsed }) {
  if (!areas || areas.length === 0) return null;

  const priorityLabel = (p) => (p === 1 ? "high" : p === 2 ? "medium" : "low");
  const priorityClass = (p) =>
    p === 1 ? "text-amber-400" : p === 2 ? "text-sky-400" : "text-gray-500";

  return (
    <div className="border border-violet-700/60 rounded-lg overflow-hidden">
      <div className="px-3 py-1.5 bg-violet-950/40 border-b border-violet-800/50 text-violet-400 text-xs font-medium flex items-center justify-between">
        <span>Discovery — {areas.length} investigation areas identified</span>
        {elapsed > 0 && <span className="text-gray-500 font-normal">{formatElapsed(elapsed)}</span>}
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {areas.map((area, i) => (
          <div key={area.id || i} className="flex items-start gap-2 text-sm">
            <span
              className={`text-xs font-medium mt-0.5 w-14 shrink-0 ${priorityClass(area.priority)}`}
            >
              {priorityLabel(area.priority)}
            </span>
            <div className="min-w-0">
              <span className="text-gray-200 font-medium">{area.label}</span>
              {area.description && <span className="text-gray-500 ml-1.5">{area.description}</span>}
              {area.probe_commands > 0 && (
                <span className="text-gray-600 ml-1.5 text-xs">
                  ({area.probe_commands} probe{area.probe_commands !== 1 ? "s" : ""})
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
