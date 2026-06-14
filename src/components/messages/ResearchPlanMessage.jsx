import { useState } from "react";

export default function ResearchPlanMessage({ msg }) {
  const subAgents = msg.sub_agents || [];
  const elapsed = msg.planner_elapsed;
  const progress = msg.progress || {};
  const aggregation = msg.aggregation || null;

  const complexityColor = {
    simple: "bg-green-900/30 text-green-400 border-green-800/40",
    medium: "bg-amber-900/30 text-amber-400 border-amber-800/40",
    complex: "bg-red-900/30 text-red-400 border-red-800/40",
  };

  const completedCount = Object.values(progress).filter((p) => p.status === "completed").length;
  const totalCount = subAgents.length;

  return (
    <div className="mb-3 mx-2">
      <div className="bg-gray-900/60 border border-lime-500/20 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 bg-lime-400 rounded-full" />
          <span className="text-xs font-medium text-lime-400">Research Plan</span>
          {elapsed != null && <span className="text-xs text-gray-600 ml-auto">{elapsed}s</span>}
        </div>

        <div className="space-y-1">
          {subAgents.map((sa, i) => {
            const agentProgress = progress[sa.id] || {};
            const status = agentProgress.status || "pending";
            const activity = agentProgress.activity || [];
            const toolCount = agentProgress.tool_count;

            return (
              <PlanItem
                key={sa.id || i}
                index={i}
                label={sa.label}
                strategy={sa.strategy}
                complexity={sa.complexity}
                complexityColor={complexityColor}
                status={status}
                toolCount={toolCount}
                activity={activity}
              />
            );
          })}
        </div>

        {aggregation && (
          <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-gray-800/40">
            {aggregation.status === "running" ? (
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse shrink-0" />
            ) : (
              <svg
                className="w-3.5 h-3.5 text-indigo-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            <span className="text-xs text-gray-400">
              {(() => {
                const n = aggregation.sources_count || completedCount || totalCount;
                const src = n === 1 ? "source" : "sources";
                return aggregation.status === "running"
                  ? `Synthesizing findings from ${n} ${src}\u2026`
                  : `Report synthesized from ${n} ${src}`;
              })()}
            </span>
            {aggregation.elapsed != null && (
              <span className="text-xs text-gray-600 ml-auto">{aggregation.elapsed}s</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const PlanItem = ({
  index,
  label,
  strategy,
  complexity,
  complexityColor,
  status,
  toolCount,
  activity,
}) => {
  const [expanded, setExpanded] = useState(false);
  const showActivity = activity.length > 0 && (expanded || status === "running");
  const visibleActivity = expanded ? activity : activity.slice(-3);

  return (
    <div className="text-xs">
      <div className="flex items-start gap-2">
        <div className="w-4 shrink-0 flex justify-end pt-0.5">
          {status === "pending" && <span className="text-gray-600 font-mono">{index + 1}.</span>}
          {status === "running" && (
            <span className="w-2 h-2 bg-lime-400 rounded-full animate-pulse mt-0.5" />
          )}
          {status === "completed" && (
            <svg
              className="w-3.5 h-3.5 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          {status === "error" && (
            <svg
              className="w-3.5 h-3.5 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`font-medium ${status === "completed" ? "text-gray-300" : status === "error" ? "text-red-300" : "text-gray-300"}`}
            >
              {label}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] border ${
                complexityColor[complexity] || complexityColor.medium
              }`}
            >
              {complexity || "medium"}
            </span>
            {status === "completed" && (toolCount > 0 || activity.length > 0) && (
              <span className="text-gray-600 text-[10px]">
                {toolCount > 0 ? `${toolCount} tools` : `${activity.length} calls`}
              </span>
            )}
            {activity.length > 0 && status !== "running" && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-gray-600 hover:text-gray-400 text-[10px] ml-auto"
              >
                {expanded ? "hide" : "details"}
              </button>
            )}
          </div>

          {strategy && status !== "completed" && (
            <p className="text-gray-500 mt-0.5 leading-snug">{strategy}</p>
          )}

          {showActivity && (
            <div className="mt-1 space-y-0.5 pl-1 border-l border-gray-800/60 ml-0.5">
              {visibleActivity.map((act, j) => (
                <div key={j} className="flex items-center gap-1.5 text-[10px]">
                  {act.status === "running" ? (
                    <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse shrink-0" />
                  ) : (
                    <span className="w-1 h-1 bg-gray-700 rounded-full shrink-0" />
                  )}
                  <span className="text-gray-500 font-mono">{act.tool}</span>
                  {act.args_preview && (
                    <span className="text-gray-600 truncate">{act.args_preview}</span>
                  )}
                  {act.elapsed != null && (
                    <span className="text-gray-700 ml-auto shrink-0">{act.elapsed}s</span>
                  )}
                </div>
              ))}
              {!expanded && activity.length > 3 && status === "running" && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="text-gray-600 hover:text-gray-400 text-[10px]"
                >
                  +{activity.length - 3} more
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
