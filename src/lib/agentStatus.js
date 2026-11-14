const AGENT_PHASES = new Set(["thinking", "iterating", "tool_running", "tool_done"]);
const ARG_KEYS = ["pattern", "path", "url", "query", "command"];

function stepLabel(step) {
  if (!step) return "";
  return step.charAt(0).toUpperCase() + step.slice(1);
}

function clip(text, max) {
  const value = String(text);
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

function argPreview(args) {
  if (!args || typeof args !== "object") return "";
  let value = "";
  for (const key of ARG_KEYS) {
    if (typeof args[key] === "string" && args[key]) {
      value = args[key];
      break;
    }
  }
  if (!value) {
    const first = Object.values(args).find((item) => typeof item === "string" && item);
    value = first || "";
  }
  return value ? clip(value, 40) : "";
}

function sizeLabel(chars) {
  if (chars > 1000) return `${(chars / 1024).toFixed(1)}KB`;
  return `${chars} chars`;
}

function modelCallText(status) {
  const { model, messages, purpose } = status;
  if (!model) return "Thinking...";
  let text = purpose === "final" ? `Calling ${model} for the final answer` : `Calling ${model}`;
  if (typeof messages === "number" && messages > 0) text += ` · ${messages} messages`;
  return text;
}

/**
 * One line for the live status indicator.
 * iterLabel is set only for agent-loop phases.
 */
export function describeAgentStatus(status) {
  if (!status) return { iterLabel: "", text: "Agent is working..." };

  const { iteration, maxIterations, phase, detail } = status;
  let text = "Working...";

  if (phase === "routing") {
    text = detail?.text || "Routing the request...";
  } else if (phase === "pipeline_running") {
    const label = stepLabel(detail?.step);
    text = detail?.text || (label ? `${label}...` : "Working...");
  } else if (phase === "pipeline_done") {
    const label = stepLabel(detail?.step);
    text = label ? `${label} done` : "Done";
  } else if (phase === "parallel" || phase === "review") {
    text = detail?.text || "Working...";
  } else if (phase === "thinking" || phase === "iterating") {
    text = modelCallText(status);
  } else if (phase === "tool_running" && detail) {
    const arg = argPreview(detail.args);
    text = arg ? `Running ${detail.name}("${arg}")` : `Running ${detail.name}`;
  } else if (phase === "tool_done" && detail) {
    text = detail.isError
      ? `${detail.name} failed`
      : `${detail.name} done (${sizeLabel(detail.outputChars)})`;
  } else if (detail?.text) {
    text = detail.text;
  }

  let iterLabel = "";
  if (AGENT_PHASES.has(phase) && iteration != null) {
    iterLabel = maxIterations
      ? `Iteration ${iteration}/${maxIterations}`
      : `Iteration ${iteration}`;
  }
  return { iterLabel, text };
}
