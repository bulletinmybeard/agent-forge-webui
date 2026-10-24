// Turn /api/agents custom entries into picker rows, skipping any @alias the
// built-in list already owns. custom_agents.yaml ids often differ from the
// picker id (api-test vs api) while the alias is the same mode.

const DEFAULT_COLOR = { dot: "bg-gray-500", text: "text-gray-400" };
const ACRONYMS = new Set(["api", "sql"]);

const CUSTOM_PALETTE = [
  { dot: "bg-cyan-500", text: "text-cyan-400" },
  { dot: "bg-blue-500", text: "text-blue-400" },
  { dot: "bg-sky-500", text: "text-sky-400" },
  { dot: "bg-teal-500", text: "text-teal-400" },
  { dot: "bg-emerald-500", text: "text-emerald-400" },
  { dot: "bg-lime-500", text: "text-lime-400" },
  { dot: "bg-amber-500", text: "text-amber-400" },
  { dot: "bg-orange-500", text: "text-orange-400" },
  { dot: "bg-rose-500", text: "text-rose-400" },
  { dot: "bg-pink-500", text: "text-pink-400" },
  { dot: "bg-fuchsia-500", text: "text-fuchsia-400" },
  { dot: "bg-purple-500", text: "text-purple-400" },
  { dot: "bg-violet-500", text: "text-violet-400" },
  { dot: "bg-indigo-500", text: "text-indigo-400" },
];

const colorForCustom = (id) => {
  if (!id) return DEFAULT_COLOR;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return CUSTOM_PALETTE[Math.abs(h) % CUSTOM_PALETTE.length];
};

const titleCase = (word) =>
  ACRONYMS.has(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1);

const deriveCustom = (agent) => {
  const aliases = Array.isArray(agent.aliases) ? agent.aliases : [];
  const first = aliases[0] || `@${agent.id}`;
  return {
    id: agent.id,
    label: titleCase(first.replace(/^@/, "")),
    prefix: `${first} `,
    aliases: aliases.join(", "),
    desc: (agent.description || "").split(". ")[0].slice(0, 80),
    connector: agent.source === "connector",
    ...colorForCustom(agent.id),
  };
};

const modeTokens = (mode) => {
  const tokens = new Set();
  const id = String(mode?.id || "").toLowerCase();
  if (id) tokens.add(id);
  const rawAliases = Array.isArray(mode?.aliases)
    ? mode.aliases
    : String(mode?.aliases || "").split(",");
  for (const alias of rawAliases) {
    const token = String(alias).trim().toLowerCase().replace(/^@/, "");
    if (token) tokens.add(token);
  }
  const prefix = String(mode?.prefix || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  if (prefix) tokens.add(prefix);
  return tokens;
};

export const customModesExceptBuiltins = (agents, baseModes) => {
  const taken = new Set();
  for (const mode of baseModes || []) {
    for (const token of modeTokens(mode)) taken.add(token);
  }
  const extra = [];
  for (const agent of agents || []) {
    if (agent?.type !== "custom") continue;
    const tokens = [...modeTokens(agent)];
    if (tokens.some((token) => taken.has(token))) continue;
    for (const token of tokens) taken.add(token);
    extra.push(deriveCustom(agent));
  }
  return extra;
};
