export default function ModelFallbackMessage({
  prev_profile: prevProfile,
  prev_model: prevModel,
  next_profile: nextProfile,
  next_model: nextModel,
  reason,
  provider,
}) {
  const prevLabel = prevModel || prevProfile || "primary";
  const nextLabel = nextModel || nextProfile || "fallback";

  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-amber-950/30 border border-amber-800/60 rounded-lg text-sm">
      <span className="text-amber-400" title="Model fallback triggered">
        ⚠
      </span>
      <div className="flex-1">
        <div className="text-amber-200">
          Primary model <span className="font-medium">{prevLabel}</span>{" "}
          {reason ? (
            <span className="text-amber-300/80">— {reason}</span>
          ) : (
            <span className="text-amber-300/80">was unavailable</span>
          )}
        </div>
        <div className="text-amber-300/80">
          Falling back to <span className="font-medium text-amber-200">{nextLabel}</span>
          {provider ? <span className="text-amber-400/60"> · {provider}</span> : null}
        </div>
      </div>
    </div>
  );
}
