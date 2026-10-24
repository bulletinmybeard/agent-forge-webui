/**
 *   node src/hooks/useModes.test.js
 */
import { customModesExceptBuiltins } from "../lib/customModes.js";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assert failed");
};

const base = [
  {
    id: "api",
    prefix: "@api ",
    aliases: "@api",
    label: "API",
    desc: "API endpoint testing & exploration",
  },
  { id: "test", prefix: "@test ", aliases: "@test", label: "Test", desc: "Run tests" },
  { id: "debug", prefix: "@debug ", aliases: "@debug", label: "Debug", desc: "Root-cause" },
];

const agents = [
  {
    id: "api-test",
    type: "custom",
    aliases: ["@api"],
    description: "API endpoint testing, validation, and exploration",
  },
  {
    id: "test-mode",
    type: "custom",
    aliases: ["@test"],
    description: "Run tests, diagnose failures, and suggest fixes",
  },
  { id: "debug", type: "custom", aliases: ["@debug"], description: "Same id as the built-in" },
  {
    id: "docker-ops",
    type: "custom",
    aliases: ["@docker"],
    description: "Docker container management",
  },
  {
    id: "infra-health",
    type: "custom",
    aliases: ["@health"],
    description: "Full-stack health check",
  },
  { id: "plan", type: "built-in", aliases: ["@plan"], description: "Not a custom agent" },
  { id: "health-2", type: "custom", aliases: ["@health"], description: "Second health alias" },
];

const extra = customModesExceptBuiltins(agents, base);
const ids = extra.map((mode) => mode.id);

assert(!ids.includes("api-test"), "alias @api is the built-in");
assert(!ids.includes("test-mode"), "alias @test is the built-in");
assert(!ids.includes("debug"), "same id as the built-in");
assert(!ids.includes("plan"), "built-in type stays out");
assert(ids.includes("docker-ops"), "new alias is kept");
assert(ids.includes("infra-health"), "new alias is kept");
assert(!ids.includes("health-2"), "second custom with the same alias is dropped");
assert(extra.find((mode) => mode.id === "docker-ops").prefix === "@docker ", "prefix from alias");

console.log("useModes.test.js ok");
