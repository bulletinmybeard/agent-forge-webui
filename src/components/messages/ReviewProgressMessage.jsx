export default function ReviewProgressMessage({ style, agents, aggregating }) {
  const rows = agents || [];
  const done = rows.filter((agent) => agent.status === "completed").length;

  return (
    <div className="mb-3 mx-2">
      <div className="bg-gray-900/60 border border-indigo-500/20 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 bg-indigo-400 rounded-full" />
          <span className="text-xs font-medium text-indigo-300">Review</span>
          {style && <span className="text-[10px] text-gray-500">{style}</span>}
          <span className="text-xs text-gray-600 ml-auto">
            {done}/{rows.length}
          </span>
        </div>
        <div className="space-y-1">
          {rows.map((agent) => (
            <div key={agent.id} className="flex items-baseline gap-2 text-xs min-w-0">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  agent.status === "completed" ? "bg-emerald-400" : "bg-indigo-400 animate-pulse"
                }`}
              />
              <span className="text-gray-300 shrink-0">{agent.label || agent.id}</span>
              {agent.detail && <span className="text-gray-500 truncate">{agent.detail}</span>}
            </div>
          ))}
        </div>
        {aggregating && (
          <div className="mt-2 pt-2 border-t border-gray-800/40 text-xs text-indigo-300">
            {aggregating}
          </div>
        )}
      </div>
    </div>
  );
}
