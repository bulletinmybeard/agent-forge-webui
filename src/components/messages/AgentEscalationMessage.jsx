export default function AgentEscalationMessage({ iteration, consecutiveErrors, searchQuery }) {
  return (
    <div className="flex items-start gap-2 text-orange-400 text-sm py-1 px-3 rounded bg-orange-950/30 border border-orange-900/50">
      <span className="shrink-0 mt-0.5">&#x1F50D;</span>
      <div>
        <span className="font-medium">Search escalation</span>
        <span className="text-orange-500/70 ml-1">
          (iteration {iteration}, {consecutiveErrors} consecutive errors)
        </span>
        <div className="text-orange-500/60 text-xs mt-0.5">
          Searching web for solution: <em>{searchQuery}</em>
        </div>
      </div>
    </div>
  );
}
