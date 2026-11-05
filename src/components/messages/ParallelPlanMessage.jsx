export default function ParallelPlanMessage({ groups, elapsed }) {
  const rows = groups || [];

  return (
    <div className="mb-3 mx-2">
      <div className="bg-gray-900/60 border border-indigo-500/20 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 bg-indigo-400 rounded-full" />
          <span className="text-xs font-medium text-indigo-300">Parallel plan</span>
          {elapsed != null && <span className="text-xs text-gray-600 ml-auto">{elapsed}s</span>}
        </div>
        <div className="space-y-1">
          {rows.map((group, index) => {
            const count = Array.isArray(group.commands) ? group.commands.length : 0;
            return (
              <div key={`${group.label || "group"}-${index}`} className="text-xs">
                <span className="text-gray-200">{group.label || `Group ${index + 1}`}</span>
                <span className="text-gray-500 ml-2">{count} commands</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
