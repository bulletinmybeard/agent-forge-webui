/**
 *   node src/lib/agentStatus.test.js
 */
import { describeAgentStatus } from "./agentStatus.js";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assert failed");
};

assert(describeAgentStatus(null).text === "Agent is working...", "null status");
assert(describeAgentStatus(undefined).iterLabel === "", "undefined has no iteration");

assert(
  describeAgentStatus({ phase: "routing" }).text === "Routing the request...",
  "routing default",
);
assert(
  describeAgentStatus({ phase: "routing", detail: { text: "Classifying" } }).text === "Classifying",
  "routing detail",
);
assert(
  describeAgentStatus({ phase: "routing", iteration: 2, maxIterations: 10 }).iterLabel === "",
  "routing hides the iteration",
);

assert(
  describeAgentStatus({
    phase: "pipeline_running",
    detail: { step: "generating", text: "Generating response (qwen)..." },
  }).text === "Generating response (qwen)...",
  "pipeline running prefers detail text",
);
assert(
  describeAgentStatus({ phase: "pipeline_running", detail: { step: "searching" } }).text ===
    "Searching...",
  "pipeline running capitalizes the step",
);
assert(
  describeAgentStatus({ phase: "pipeline_running" }).text === "Working...",
  "pipeline running with no step",
);
assert(
  describeAgentStatus({ phase: "pipeline_done", detail: { step: "searching" } }).text ===
    "Searching done",
  "pipeline done",
);
assert(describeAgentStatus({ phase: "pipeline_done" }).text === "Done", "pipeline done with no step");

assert(
  describeAgentStatus({ phase: "parallel", detail: { text: "deps · 2 commands" } }).text ===
    "deps · 2 commands",
  "parallel text",
);
assert(describeAgentStatus({ phase: "review" }).text === "Working...", "review without text");

const calling = describeAgentStatus({
  phase: "thinking",
  iteration: 2,
  maxIterations: 10,
  model: "qwen3.5",
  messages: 4,
});
assert(calling.text === "Calling qwen3.5 · 4 messages", "model call names the model and context");
assert(calling.iterLabel === "Iteration 2/10", "agent phases keep the iteration");

assert(
  describeAgentStatus({ phase: "thinking", model: "qwen3.5", purpose: "final", messages: 6 }).text ===
    "Calling qwen3.5 for the final answer · 6 messages",
  "final answer purpose",
);
assert(
  describeAgentStatus({ phase: "iterating", model: "qwen3.5", messages: 0 }).text ===
    "Calling qwen3.5",
  "zero messages stays off the line",
);
assert(describeAgentStatus({ phase: "thinking" }).text === "Thinking...", "thinking without a model");
assert(
  describeAgentStatus({ phase: "thinking", iteration: 1 }).iterLabel === "Iteration 1",
  "iteration without a max",
);

const tool = describeAgentStatus({
  phase: "tool_running",
  iteration: 3,
  maxIterations: 10,
  detail: { name: "grep_text", args: { command: "ls", pattern: "TODO" } },
});
assert(tool.text === 'Running grep_text("TODO")', "preferred arg key beats the first value");

const longArg = "x".repeat(50);
assert(
  describeAgentStatus({
    phase: "tool_running",
    detail: { name: "shell", args: { command: longArg } },
  }).text === `Running shell("${"x".repeat(37)}...")`,
  "tool arg truncates at 40",
);
assert(
  describeAgentStatus({ phase: "tool_running", detail: { name: "shell" } }).text === "Running shell",
  "tool with no args",
);

assert(
  describeAgentStatus({
    phase: "tool_done",
    detail: { name: "read_file", outputChars: 12, isError: false },
  }).text === "read_file done (12 chars)",
  "tool done",
);
assert(
  describeAgentStatus({
    phase: "tool_done",
    detail: { name: "read_file", outputChars: 2048, isError: false },
  }).text === "read_file done (2.0KB)",
  "tool done uses KB past 1000 chars",
);
assert(
  describeAgentStatus({
    phase: "tool_done",
    detail: { name: "shell", outputChars: 4, isError: true },
  }).text === "shell failed",
  "tool error",
);

assert(
  describeAgentStatus({ phase: "other", detail: { text: "Still going" } }).text === "Still going",
  "unknown phase uses detail text",
);

console.log("agentStatus: ok");
