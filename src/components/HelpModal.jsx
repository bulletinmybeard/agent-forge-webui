import { useEffect, useState } from "react";

export default function HelpModal({ open, onClose }) {
  const [activeTab, setActiveTab] = useState("modes");
  const [agents, setAgents] = useState([]);
  const [tools, setTools] = useState([]);

  useEffect(() => {
    if (!open) return;
    setActiveTab("modes");
    fetch("/api/agents")
      .then((r) => (r.ok ? r.json() : { agents: [] }))
      .then((data) => setAgents(data.agents || []))
      .catch(() => {});
    fetch("/api/tools")
      .then((r) => (r.ok ? r.json() : { tools: [] }))
      .then((data) => setTools(data.tools || []))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const customCount = agents.filter((a) => a.type === "custom").length;
  const tabs = [
    { id: "modes", label: "Modes" },
    { id: "tools", label: "Tools" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-indigo-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <h2 className="text-lg font-semibold text-gray-100">AgentForge Help</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              }`}
            >
              {tab.label}
              {tab.id === "modes" && customCount > 0 && (
                <span className="ml-1.5 text-xs bg-emerald-800/60 text-emerald-400 rounded px-1">
                  +{customCount}
                </span>
              )}
              {tab.id === "tools" && tools.length > 0 && (
                <span className="ml-1.5 text-xs bg-gray-700 text-gray-400 rounded px-1">
                  {tools.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {activeTab === "modes" && <ModesTab agents={agents} />}
          {activeTab === "tools" && <ToolsTab tools={tools} />}
        </div>

        <div className="px-6 py-3 border-t border-gray-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const ModesTab = ({ agents = [] }) => {
  if (agents.length === 0) {
    return <p className="text-sm text-gray-500">Loading modes…</p>;
  }

  const builtIns = agents.filter((a) => a.type === "built-in");
  const customs = agents.filter((a) => a.type === "custom");

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400 mb-3">
        Without a prefix the message goes to <strong className="text-gray-300">Chat</strong>{" "}
        (general knowledge). <code className="text-indigo-400">@docs</code> can appear anywhere in
        the prompt to search indexed docs. Other prefixes must appear at the start.
      </p>

      {builtIns.map((m) => {
        const prefix = m.is_default ? "(default — no prefix)" : (m.aliases || []).join(", ");
        return (
          <div
            key={m.id}
            className={`border rounded-lg p-4 ${
              m.is_default
                ? "bg-indigo-950/30 border-indigo-700/40"
                : "bg-gray-800/60 border-gray-700/50"
            }`}
          >
            <div className="flex items-start justify-between gap-4 mb-1.5">
              <code className="text-indigo-400 text-sm font-mono font-medium">{prefix}</code>
              {m.profile && (
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  profile: {m.profile}
                </span>
              )}
            </div>
            {m.title && (
              <h3 className="text-sm font-medium text-gray-200 mb-1">
                {m.title}
                {m.is_default && (
                  <span className="ml-2 text-xs text-indigo-400 font-normal">default</span>
                )}
              </h3>
            )}
            <p className="text-xs text-gray-400 mb-2">{m.description}</p>
            {m.example && (
              <div className="text-xs text-gray-500">
                <span className="text-gray-600 mr-1">Example:</span>
                <code className="text-gray-400">{m.example}</code>
              </div>
            )}
          </div>
        );
      })}

      {customs.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <h3 className="text-sm font-semibold text-gray-300">Custom Agents</h3>
            <span className="text-xs text-gray-600">(defined in custom_agents.yaml)</span>
          </div>
          <div className="space-y-2">
            {customs.map((agent) => (
              <div
                key={agent.id}
                className="border border-emerald-900/40 bg-emerald-950/20 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4 mb-1.5">
                  <div className="flex flex-wrap gap-1">
                    {(agent.aliases || []).map((alias) => (
                      <code key={alias} className="text-emerald-400 text-sm font-mono font-medium">
                        {alias}
                      </code>
                    ))}
                  </div>
                  {agent.profile && (
                    <span className="text-xs text-gray-500 whitespace-nowrap shrink-0">
                      profile: {agent.profile}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-medium text-gray-200 mb-1 capitalize">
                  {agent.id.replace(/-/g, " ")}
                  <span className="ml-2 text-xs text-emerald-500 font-normal">custom</span>
                </h3>
                <p className="text-xs text-gray-400 mb-2">{agent.description}</p>
                {Array.isArray(agent.tools) && agent.tools.length > 0 && (
                  <div className="text-xs text-gray-600">
                    <span className="text-gray-700 mr-1">Tools:</span>
                    {agent.tools.slice(0, 6).join(", ")}
                    {agent.tools.length > 6 && (
                      <span className="text-gray-700"> +{agent.tools.length - 6} more</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-3">
            Edit <code className="text-gray-500">custom_agents.yaml</code> to add or modify custom
            agents. Changes take effect on server restart.
          </p>
        </div>
      )}
    </div>
  );
};

const ToolsTab = ({ tools = [] }) => {
  if (tools.length === 0) {
    return <p className="text-sm text-gray-500">Loading tools…</p>;
  }

  const groups = [];
  const byCategory = new Map();
  for (const t of tools) {
    const cat = t.category || "Other";
    let group = byCategory.get(cat);
    if (!group) {
      group = { name: cat, tools: [] };
      byCategory.set(cat, group);
      groups.push(group);
    }
    group.tools.push(t);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400 mb-3">
        {tools.length} tools across {groups.length} categories. The exact set exposed per run
        depends on the active profile and mode.
      </p>
      {groups.map((cat) => (
        <div key={cat.name}>
          <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
            {cat.name}
            <span className="text-xs text-gray-600 font-normal">({cat.tools.length})</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {cat.tools.map((t) => (
              <div
                key={t.name}
                className="flex items-baseline gap-2 px-3 py-1.5 rounded-md hover:bg-gray-800/40 transition-colors"
              >
                <code className="text-xs text-indigo-400 font-mono whitespace-nowrap">
                  {t.name}
                </code>
                <span className="text-xs text-gray-500 truncate">{t.description}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
