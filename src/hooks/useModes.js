import { useEffect, useState } from "react";

const BASE_MODES = [
  {
    id: "agent",
    label: "Agent",
    prefix: "@agent ",
    aliases: "@agent",
    desc: "Tool calling — files, Docker, SSH…",
    dot: "bg-green-500",
    text: "text-green-400",
  },
  {
    id: "api",
    label: "API",
    prefix: "@api ",
    aliases: "@api",
    desc: "API endpoint testing & exploration",
    dot: "bg-cyan-500",
    text: "text-cyan-400",
  },
  {
    id: "chat",
    label: "Chat",
    prefix: "",
    aliases: "default — no prefix",
    desc: "General knowledge — no tools",
    dot: "bg-gray-500",
    text: "text-gray-400",
  },
  {
    id: "cloud",
    label: "Cloud",
    prefix: "@cloud ",
    aliases: "@cloud",
    desc: "Cloud services — files, transfers, links",
    dot: "bg-blue-600",
    text: "text-blue-300",
  },
  {
    id: "coding",
    label: "Coding",
    prefix: "@coding ",
    aliases: "@coding, @code",
    desc: "Bulk code transforms — find, narrow, LLM bursts, verify, apply",
    dot: "bg-fuchsia-500",
    text: "text-fuchsia-400",
  },
  {
    id: "debug",
    label: "Debug",
    prefix: "@debug ",
    aliases: "@debug",
    desc: "Root-cause investigation",
    dot: "bg-red-500",
    text: "text-red-400",
  },
  {
    id: "discover",
    label: "Discover",
    prefix: "@discover ",
    aliases: "@discover",
    desc: "Multi-area system discovery",
    dot: "bg-teal-500",
    text: "text-teal-400",
  },
  {
    id: "search",
    label: "Docs",
    prefix: "@docs ",
    aliases: "@docs",
    desc: "RAG over indexed knowledge + #filters",
    dot: "bg-blue-500",
    text: "text-blue-400",
  },
  {
    id: "connector",
    label: "Connector",
    prefix: "@conn ",
    aliases: "@conn, @connector",
    desc: "Gmail, Drive — connected accounts",
    dot: "bg-indigo-400",
    text: "text-indigo-300",
  },
  {
    id: "logs",
    label: "Logs",
    prefix: "@logs ",
    aliases: "@logs",
    desc: "Log analysis and parsing",
    dot: "bg-orange-500",
    text: "text-orange-400",
  },
  {
    id: "monitor",
    label: "Monitor",
    prefix: "@monitor ",
    aliases: "@monitor",
    desc: "Website change monitoring",
    dot: "bg-violet-500",
    text: "text-violet-400",
  },
  {
    id: "perf",
    label: "Perf",
    prefix: "@perf ",
    aliases: "@perf",
    desc: "Performance profiling & bottlenecks",
    dot: "bg-pink-500",
    text: "text-pink-400",
  },
  {
    id: "pipeline",
    label: "Pipeline",
    prefix: "@pipeline ",
    aliases: "@pipeline",
    desc: "Multi-step workflow — full tool set",
    dot: "bg-purple-500",
    text: "text-purple-400",
  },
  {
    id: "research",
    label: "Research",
    prefix: "@research ",
    aliases: "@research",
    desc: "Parallel web research — multi-agent",
    dot: "bg-lime-500",
    text: "text-lime-400",
  },
  {
    id: "review",
    label: "Review",
    prefix: "@review ",
    aliases: "@review",
    desc: "Parallel code review — 4 sub-agents",
    dot: "bg-indigo-500",
    text: "text-indigo-400",
  },
  {
    id: "scheduler",
    label: "Scheduler",
    prefix: "@scheduler ",
    aliases: "@scheduler",
    desc: "Schedule recurring tasks",
    dot: "bg-rose-500",
    text: "text-rose-400",
  },
  {
    id: "web",
    label: "Search",
    prefix: "@search ",
    aliases: "@search",
    desc: "Internet search via agent tools",
    dot: "bg-sky-500",
    text: "text-sky-400",
  },
  {
    id: "security",
    label: "Security",
    prefix: "@security ",
    aliases: "@security",
    desc: "Security scan — secrets, deps, config",
    dot: "bg-amber-600",
    text: "text-amber-400",
  },
  {
    id: "sql",
    label: "SQL",
    prefix: "@sql ",
    aliases: "@sql",
    desc: "Natural language → SQL + #db filter",
    dot: "bg-yellow-500",
    text: "text-yellow-400",
  },
  {
    id: "test",
    label: "Test",
    prefix: "@test ",
    aliases: "@test",
    desc: "Run tests, diagnose failures, suggest fixes",
    dot: "bg-emerald-500",
    text: "text-emerald-400",
  },
];

const BASE_IDS = new Set(BASE_MODES.map((m) => m.id));
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

export default function useModes() {
  const [modes, setModes] = useState(BASE_MODES);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/agents")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.agents) return;
        const extra = data.agents
          .filter((a) => a.type === "custom" && !BASE_IDS.has(a.id))
          .map(deriveCustom);
        if (extra.length > 0) setModes([...BASE_MODES, ...extra]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return modes;
}
