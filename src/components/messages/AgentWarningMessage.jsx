const CATEGORY_LABELS = {
  hallucination: "Hallucinated tool call",
  duplicate_loop: "Duplicate loop detected",
};

export default function AgentWarningMessage({ iteration, category, message }) {
  const label = CATEGORY_LABELS[category] || category;

  return (
    <div className="flex items-start gap-2 text-yellow-400 text-sm py-1 px-3 rounded bg-yellow-950/30 border border-yellow-900/50">
      <span className="shrink-0 mt-0.5">&#x26A0;</span>
      <div>
        <span className="font-medium">{label}</span>
        <span className="text-yellow-500/70 ml-1">(iteration {iteration})</span>
        {message && <span className="text-yellow-500/60 ml-1">— {message}</span>}
      </div>
    </div>
  );
}
