export default function ResearchProgressMessage({ msg }) {
  const agents = msg.agents || [];

  return (
    <div className="mb-3 mx-2">
      <div className="bg-gray-900/40 border border-gray-800/50 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-gray-400">Sub-agents</span>
        </div>

        <div className="space-y-1.5">
          {agents.map((sa) => (
            <div key={sa.id} className="flex items-center gap-2 text-xs">
              {sa.status === "running" && (
                <span className="w-1.5 h-1.5 bg-lime-400 rounded-full animate-pulse shrink-0" />
              )}
              {sa.status === "completed" && (
                <svg
                  className="w-3 h-3 text-emerald-400 shrink-0"
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
              {sa.status === "error" && (
                <svg
                  className="w-3 h-3 text-red-400 shrink-0"
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

              <span className={`${sa.status === "completed" ? "text-gray-300" : "text-gray-500"}`}>
                {sa.label}
              </span>

              {sa.status === "completed" && sa.tool_count != null && (
                <span className="text-gray-600 ml-auto">{sa.tool_count} tools</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
