import { useEffect, useMemo, useState } from "react";
import useCommandPermissions from "../hooks/useCommandPermissions";

const TOOLS = [
  {
    id: "shell",
    label: "Shell",
    scope: "local",
    heading: "Managing Shell permissions",
    context:
      "Local shell commands run on the machine where AgentForge's worker executes tools (npm, git, docker, and similar). Rules here apply to every chat session immediately after you save — no redeploy. In confirm mode, blocked patterns are hard-denied; everything else goes through the destructive-command guard and may prompt you. Allowlist and denylist skip that guard and enforce your lists only.",
    appliesTo: "shell tool on the local worker",
  },
  {
    id: "ssh",
    label: "SSH",
    scope: "remote",
    heading: "Managing SSH permissions",
    context:
      "SSH commands run on remote hosts allowed in config (tools.ssh.allowed_hosts). This tab controls what the agent may run after it connects — not which hosts are permitted. Saved overrides apply on the next ssh tool call in any session, same as Shell.",
    appliesTo: "ssh tool on configured remote hosts",
  },
];

const MODES = [
  { value: "confirm", label: "Confirm — prompt before destructive commands" },
  { value: "allowlist", label: "Allowlist — only listed commands/patterns run" },
  { value: "denylist", label: "Denylist — block listed patterns, allow rest" },
];

const emptyPolicy = () => ({
  mode: "confirm",
  allowed_commands: [],
  allowed_patterns: [],
  blocked_patterns: [],
});

const clonePolicy = (policy) => ({
  mode: policy?.mode || "confirm",
  allowed_commands: [...(policy?.allowed_commands || [])],
  allowed_patterns: [...(policy?.allowed_patterns || [])],
  blocked_patterns: [...(policy?.blocked_patterns || [])],
});

const policyFromBundle = (bundle) => {
  const src = bundle?.override ?? bundle?.effective ?? bundle?.yaml ?? emptyPolicy();
  return clonePolicy(src);
};

const linesToArray = (text) =>
  text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

const arrayToLines = (arr) => (arr || []).join("\n");

const policiesEqual = (a, b) =>
  a.mode === b.mode &&
  JSON.stringify(a.allowed_commands) === JSON.stringify(b.allowed_commands) &&
  JSON.stringify(a.allowed_patterns) === JSON.stringify(b.allowed_patterns) &&
  JSON.stringify(a.blocked_patterns) === JSON.stringify(b.blocked_patterns);

const PolicyPreview = ({ title, policy, hint }) => (
  <div className="rounded-lg border border-gray-800 bg-gray-800/30 p-3">
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{title}</span>
      {hint && <span className="text-[9px] text-gray-600">{hint}</span>}
    </div>
    <pre className="text-[10px] font-mono text-gray-400 whitespace-pre-wrap break-all leading-relaxed">
      {JSON.stringify(policy, null, 2)}
    </pre>
  </div>
);

const VerdictBadge = ({ verdict }) => {
  if (!verdict) return null;
  const styles = {
    allow: "bg-green-950/50 border-green-700/50 text-green-300",
    deny: "bg-red-950/50 border-red-700/50 text-red-300",
    confirm: "bg-amber-950/50 border-amber-700/50 text-amber-300",
  };
  const cls = styles[verdict.action] || "bg-gray-800 border-gray-700 text-gray-300";
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs ${cls}`}>
      <div className="flex items-center gap-2">
        <span className="font-semibold uppercase tracking-wide">{verdict.action}</span>
        {verdict.source && <span className="text-[10px] opacity-70">via {verdict.source}</span>}
      </div>
      {verdict.reason && <p className="mt-1 text-[11px] opacity-90">{verdict.reason}</p>}
    </div>
  );
};

const TabContext = ({ tool }) => (
  <div className="mb-4 space-y-3">
    <h3 className="text-sm font-semibold text-gray-200">{tool.heading}</h3>
    <div className="rounded-lg border border-gray-800 border-l-2 border-l-gray-600 bg-gray-800/25 px-3 py-2.5 space-y-1.5">
      <p className="text-[11px] text-gray-400 leading-relaxed">{tool.context}</p>
      <p className="text-[10px] text-gray-500">
        <span className="text-gray-600">Applies to:</span> {tool.appliesTo}
      </p>
    </div>
  </div>
);

const ToolPanel = ({
  tool,
  bundle,
  local,
  onChange,
  onValidate,
  validating,
  verdict,
  testCommand,
  onTestCommandChange,
}) => {
  const handleField = (field, value) => {
    onChange({ ...local, [field]: value });
  };

  const handleListField = (field, text) => {
    onChange({ ...local, [field]: linesToArray(text) });
  };

  const hasOverride = bundle?.override != null;
  const baseline = bundle?.yaml ?? emptyPolicy();
  const effective = bundle?.effective ?? emptyPolicy();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-500">
          Runtime overrides apply immediately and persist until reset.
        </p>
        {hasOverride ? (
          <span className="text-[9px] text-indigo-400 uppercase tracking-wide">Override active</span>
        ) : (
          <span className="text-[9px] text-gray-600 uppercase tracking-wide">YAML baseline</span>
        )}
      </div>

      <div>
        <label className="block text-[10px] text-gray-500 mb-0.5">Mode</label>
        <select
          value={local.mode}
          onChange={(e) => handleField("mode", e.target.value)}
          className="w-full text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1.5
                     text-gray-300 focus:outline-none focus:border-indigo-500"
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">Allowed commands</label>
          <textarea
            rows={4}
            value={arrayToLines(local.allowed_commands)}
            onChange={(e) => handleListField("allowed_commands", e.target.value)}
            placeholder={"git\nls\nnpm"}
            className="w-full text-xs font-mono bg-gray-800 border border-gray-700 rounded px-2 py-1.5
                       text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-y"
          />
          <p className="text-[9px] text-gray-600 mt-0.5">One command per line (allowlist mode)</p>
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">Allowed patterns</label>
          <textarea
            rows={4}
            value={arrayToLines(local.allowed_patterns)}
            onChange={(e) => handleListField("allowed_patterns", e.target.value)}
            placeholder={"^git\\s"}
            className="w-full text-xs font-mono bg-gray-800 border border-gray-700 rounded px-2 py-1.5
                       text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-y"
          />
          <p className="text-[9px] text-gray-600 mt-0.5">Regex, one per line (allowlist mode)</p>
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">Blocked patterns</label>
          <textarea
            rows={4}
            value={arrayToLines(local.blocked_patterns)}
            onChange={(e) => handleListField("blocked_patterns", e.target.value)}
            placeholder={"rm\\s+-rf"}
            className="w-full text-xs font-mono bg-gray-800 border border-gray-700 rounded px-2 py-1.5
                       text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-y"
          />
          <p className="text-[9px] text-gray-600 mt-0.5">Regex hard-deny, one per line</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PolicyPreview title={`YAML baseline (${tool.label})`} policy={baseline} hint="from config" />
        <PolicyPreview
          title={`Effective policy (${tool.label})`}
          policy={effective}
          hint="merged result"
        />
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-800/20 p-3 space-y-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
          Test command
        </span>
        <p className="text-[9px] text-gray-600">
          Validates against the current form values (unsaved edits included).
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={testCommand}
            onChange={(e) => onTestCommandChange(e.target.value)}
            placeholder="e.g. git status"
            className="flex-1 text-xs font-mono bg-gray-800 border border-gray-700 rounded px-2 py-1.5
                       text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={onValidate}
            disabled={!testCommand.trim() || validating}
            className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded-lg
                       hover:bg-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {validating ? "Testing…" : "Validate"}
          </button>
        </div>
        <VerdictBadge verdict={verdict} />
      </div>
    </div>
  );
};

export default function CommandPermissionsModal({ open, onClose }) {
  const { data, loading, error, saveOverrides, resetOverrides, validate, refresh } =
    useCommandPermissions();

  const [activeTab, setActiveTab] = useState("shell");
  const [local, setLocal] = useState({ shell: emptyPolicy(), ssh: emptyPolicy() });
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [testCommands, setTestCommands] = useState({ shell: "", ssh: "" });
  const [verdicts, setVerdicts] = useState({ shell: null, ssh: null });
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (open && data) {
      setLocal({
        shell: policyFromBundle(data.shell),
        ssh: policyFromBundle(data.ssh),
      });
      setSaveError(null);
      setVerdicts({ shell: null, ssh: null });
    }
  }, [open, data]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const isModified = useMemo(() => {
    if (!data) return false;
    for (const tool of TOOLS) {
      const effective = data[tool.id]?.effective ?? emptyPolicy();
      if (!policiesEqual(local[tool.id], clonePolicy(effective))) return true;
    }
    return false;
  }, [data, local]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveOverrides({ shell: local.shell, ssh: local.ssh });
      onClose();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setSaveError(null);
    try {
      await resetOverrides(activeTab);
      setVerdicts((prev) => ({ ...prev, [activeTab]: null }));
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setResetting(false);
    }
  };

  const handleValidate = async () => {
    const cmd = testCommands[activeTab].trim();
    if (!cmd) return;
    setValidating(true);
    setVerdicts((prev) => ({ ...prev, [activeTab]: null }));
    try {
      const result = await validate(activeTab, cmd, local[activeTab]);
      setVerdicts((prev) => ({ ...prev, [activeTab]: result }));
    } catch (e) {
      setVerdicts((prev) => ({
        ...prev,
        [activeTab]: { action: "error", reason: e.message, source: null },
      }));
    } finally {
      setValidating(false);
    }
  };

  if (!open) return null;

  const activeBundle = data?.[activeTab];
  const activeTool = TOOLS.find((t) => t.id === activeTab) ?? TOOLS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl mx-4
                   max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Command Permissions</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Shell and SSH policy — runtime overrides on top of YAML baseline
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-sm leading-none px-1"
            aria-label="Close command permissions"
          >
            x
          </button>
        </div>

        <div className="flex border-b border-gray-800 px-5">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveTab(tool.id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors
                         ${
                           activeTab === tool.id
                             ? "border-indigo-500 text-indigo-300"
                             : "border-transparent text-gray-500 hover:text-gray-300"
                         }`}
            >
              {tool.label}
              <span
                className={`font-normal ${
                  activeTab === tool.id ? "text-gray-500" : "text-gray-600"
                }`}
              >
                {" "}
                · {tool.scope}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && !data && (
            <p className="text-xs text-gray-500 text-center py-8">Loading policies…</p>
          )}

          {error && (
            <div className="rounded-lg border border-red-800/40 bg-red-950/30 px-3 py-2 mb-3">
              <p className="text-xs text-red-300">{error}</p>
              <button
                type="button"
                onClick={() => void refresh()}
                className="text-[10px] text-red-400 hover:text-red-200 mt-1"
              >
                Retry
              </button>
            </div>
          )}

          {data && activeBundle && (
            <>
              <TabContext tool={activeTool} />
              <ToolPanel
                tool={activeTool}
                bundle={activeBundle}
                local={local[activeTab]}
                onChange={(next) => setLocal((prev) => ({ ...prev, [activeTab]: next }))}
                onValidate={() => void handleValidate()}
                validating={validating}
                verdict={verdicts[activeTab]}
                testCommand={testCommands[activeTab]}
                onTestCommandChange={(v) => setTestCommands((prev) => ({ ...prev, [activeTab]: v }))}
              />
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={resetting || loading}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {resetting ? "Resetting…" : `Reset ${activeTool.label} override`}
            </button>
            {isModified && (
              <span className="text-[9px] text-indigo-400 uppercase tracking-wide">Modified</span>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {saveError && <span className="text-[10px] text-red-400">{saveError}</span>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || loading || !isModified}
                className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg
                           hover:bg-indigo-500 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}