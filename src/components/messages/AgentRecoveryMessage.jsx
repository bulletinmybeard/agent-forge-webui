export default function AgentRecoveryMessage({ iteration, tool, error, attempt, maxRetries }) {
  return (
    <div className="flex items-start gap-2 text-amber-400 text-sm py-1 px-3 rounded bg-amber-950/30 border border-amber-900/50">
      <span className="shrink-0 mt-0.5">&#x1F527;</span>
      <div>
        <span className="font-medium">Error recovery</span>
        <span className="text-amber-500/70 ml-1">
          (attempt {attempt}/{maxRetries}, iteration {iteration})
        </span>
        <span className="text-amber-500/60 ml-1">
          — <code className="text-amber-400/80">{tool}</code> failed
        </span>
        {error && <div className="text-amber-500/50 text-xs mt-0.5 truncate max-w-xl">{error}</div>}
      </div>
    </div>
  );
}
