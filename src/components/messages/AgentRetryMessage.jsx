export default function AgentRetryMessage({
  iteration,
  attempt,
  maxAttempts,
  reason,
  delaySeconds,
}) {
  return (
    <div className="flex items-start gap-2 text-amber-400 text-sm py-1 px-3 rounded bg-amber-950/30 border border-amber-900/50">
      <span className="shrink-0 mt-0.5">&#x27F3;</span>
      <div>
        <span className="font-medium">Model retry</span>
        <span className="text-amber-500/70 ml-1">
          (attempt {attempt}/{maxAttempts}, iteration {iteration})
        </span>
        {reason && <span className="text-amber-500/60 ml-1">— {reason}</span>}
        {delaySeconds > 0 && (
          <span className="text-amber-500/50 ml-1">, retrying in {delaySeconds}s</span>
        )}
      </div>
    </div>
  );
}
