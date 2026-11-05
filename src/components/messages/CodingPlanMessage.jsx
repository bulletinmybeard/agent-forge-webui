function argPreview(args) {
  if (!args || typeof args !== "object") return "";
  const parts = [];
  for (const key of ["path", "pattern", "instruction"]) {
    const value = args[key];
    if (typeof value !== "string" || !value) continue;
    const shown = value.length > 72 ? `${value.slice(0, 69)}...` : value;
    parts.push(shown);
  }
  return parts.join(" · ");
}

export default function CodingPlanMessage({ source, plan, elapsed }) {
  const steps = (plan && plan.steps) || [];
  const sourceLabel = source === "planner" ? "Planner" : source === "template" ? "Template" : source;

  return (
    <div className="mb-3 mx-2">
      <div className="bg-gray-900/60 border border-indigo-500/20 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 bg-indigo-400 rounded-full" />
          <span className="text-xs font-medium text-indigo-300">Coding plan</span>
          {sourceLabel && <span className="text-[10px] text-gray-500">{sourceLabel}</span>}
          {elapsed != null && <span className="text-xs text-gray-600 ml-auto">{elapsed}s</span>}
        </div>
        <div className="space-y-1">
          {steps.map((step, index) => {
            const preview = argPreview(step.args);
            return (
              <div key={`${step.tool}-${index}`} className="text-xs min-w-0">
                <span className="text-gray-500 font-mono mr-2">{index + 1}.</span>
                <span className="text-gray-200 font-mono">{step.tool}</span>
                {preview && <span className="text-gray-500 ml-2">{preview}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
