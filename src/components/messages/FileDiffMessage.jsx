import { useCallback, useMemo, useState } from "react";

const COLLAPSE_LINES = 40;

const actionStyle = (action) => {
  switch (action) {
    case "reverted":
      return { border: "border-l-amber-500/60", label: "Reverted", badge: "text-amber-400" };
    case "written":
      return { border: "border-l-emerald-500/60", label: "Written", badge: "text-emerald-400" };
    case "compared":
      return { border: "border-l-violet-500/60", label: "Compared", badge: "text-violet-400" };
    // biome-ignore lint/complexity/noUselessSwitchCase: Keep explicit "edited" case for readability.
    case "edited":
    default:
      return { border: "border-l-sky-500/60", label: "Edited", badge: "text-sky-400" };
  }
};

const basename = (p) => {
  if (!p) return "";
  const idx = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return idx >= 0 ? p.slice(idx + 1) : p;
};

const classifyLine = (line) => {
  if (line.startsWith("+++") || line.startsWith("---")) return "meta";
  if (line.startsWith("@@")) return "hunk";
  if (line.startsWith("+")) return "add";
  if (line.startsWith("-")) return "del";
  return "ctx";
};

export default function FileDiffMessage({
  action,
  path,
  pre_hash,
  post_hash,
  additions,
  deletions,
  diff_text,
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const style = actionStyle(action);
  const fileName = action === "compared" ? path || "(comparison)" : basename(path);

  const lines = useMemo(() => {
    if (!diff_text) return [];
    return diff_text.split("\n");
  }, [diff_text]);

  const overflow = lines.length > COLLAPSE_LINES;
  const shownLines = expanded || !overflow ? lines : lines.slice(0, COLLAPSE_LINES);

  const handleCopy = useCallback(async () => {
    if (!diff_text) return;
    try {
      await navigator.clipboard.writeText(diff_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable. Silently ignore */
    }
  }, [diff_text]);

  const hasDiff = lines.length > 0;

  return (
    <div
      className={`rounded-lg border border-gray-800 border-l-2 ${style.border} overflow-hidden`}
      title={path}
    >
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-gray-900/80 border-b border-gray-800">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs font-medium ${style.badge}`}>&#x2713; {style.label}</span>
          <span className="text-gray-400 text-xs">·</span>
          <code className="text-xs text-gray-200 truncate" title={path}>
            {fileName || "(unknown file)"}
          </code>
          <span className="text-xs text-emerald-400/80 font-mono">+{additions ?? 0}</span>
          <span className="text-xs text-rose-400/80 font-mono">-{deletions ?? 0}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pre_hash && pre_hash.length > 0 && (
            <span
              className="hidden sm:inline text-[10px] text-gray-500 font-mono"
              title={`pre: ${pre_hash}\npost: ${post_hash || ""}`}
            >
              {String(pre_hash).slice(0, 8)}…{String(post_hash || "").slice(0, 8)}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="text-gray-500 hover:text-gray-300 transition-colors text-xs"
            title={copied ? "Copied!" : "Copy diff"}
            disabled={!hasDiff}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {hasDiff ? (
        <pre className="text-xs font-mono overflow-x-auto bg-gray-950/60 px-0 py-1 leading-snug">
          {shownLines.map((line, i) => {
            const kind = classifyLine(line);
            let cls = "text-gray-400";
            if (kind === "add") cls = "text-emerald-300 bg-emerald-950/30";
            else if (kind === "del") cls = "text-rose-300 bg-rose-950/30";
            else if (kind === "hunk") cls = "text-indigo-400/80 bg-indigo-950/20";
            else if (kind === "meta") cls = "text-gray-500";
            return (
              <div key={i} className={`${cls} px-3 whitespace-pre`}>
                {line || " "}
              </div>
            );
          })}
          {overflow && !expanded && (
            <div className="px-3 py-1 border-t border-gray-800/50">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="text-indigo-400 hover:text-indigo-300 text-xs"
              >
                Show all {lines.length} lines…
              </button>
            </div>
          )}
          {overflow && expanded && (
            <div className="px-3 py-1 border-t border-gray-800/50">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-indigo-400 hover:text-indigo-300 text-xs"
              >
                Collapse
              </button>
            </div>
          )}
        </pre>
      ) : (
        <div className="px-3 py-2 text-xs text-gray-500 italic">
          No textual diff available (binary file or empty change).
        </div>
      )}
    </div>
  );
}
