import { useEffect, useState } from "react";
import { customModesExceptBuiltins } from "../lib/customModes";

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
    id: "build",
    label: "Build",
    prefix: "@build ",
    aliases: "@build",
    desc: "Execute an approved plan — queued workers",
    dot: "bg-orange-600",
    text: "text-orange-300",
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
    id: "film",
    label: "Film",
    prefix: "@film ",
    aliases: "@film, @movie, @movies",
    desc: "Movies and TV — TMDB lookup, library, recommend",
    dot: "bg-rose-400",
    text: "text-rose-300",
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
    id: "plan",
    label: "Plan",
    prefix: "@plan ",
    aliases: "@plan",
    desc: "Draft a markdown plan, then approve to build",
    dot: "bg-stone-400",
    text: "text-stone-300",
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

export default function useModes() {
  const [modes, setModes] = useState(BASE_MODES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/agents")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.agents) return;
        const extra = customModesExceptBuiltins(data.agents, BASE_MODES);
        if (extra.length > 0) setModes([...BASE_MODES, ...extra]);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { modes, ready };
}
