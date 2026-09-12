import { useState } from "react";
import { parsePlanDocument } from "../../lib/planDocument";
import MarkdownContent from "../MarkdownContent";

const STATUS_STYLE = {
  draft: "bg-stone-800/80 text-stone-300 border-stone-600/50",
  approved: "bg-emerald-950/60 text-emerald-400 border-emerald-800/40",
  building: "bg-amber-950/60 text-amber-400 border-amber-800/40",
  done: "bg-emerald-950/60 text-emerald-400 border-emerald-800/40",
  cancelled: "bg-red-950/60 text-red-400 border-red-800/40",
};

export default function PlanDocumentMessage({ text, planPath, planTarget, elapsed }) {
  const [showMarkdown, setShowMarkdown] = useState(false);
  const parsed = parsePlanDocument(text || "");
  const status = parsed.status || "draft";
  const path = planPath || "";
  const target = planTarget || parsed.target;
  const isBuild = parsed.kind === "build";

  return (
    <div className="border border-stone-600/50 rounded-lg overflow-hidden">
      <div className="px-3 py-1.5 bg-stone-900/80 border-b border-stone-700/50 flex items-center gap-2 text-xs">
        <span className="text-stone-300 font-medium">{isBuild ? "Build recap" : "Plan"}</span>
        <span
          className={`px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wide ${
            STATUS_STYLE[status] || STATUS_STYLE.draft
          }`}
        >
          {status}
        </span>
        {elapsed > 0 && <span className="text-gray-600 ml-auto">{elapsed}s</span>}
      </div>

      {(path || target || parsed.branch) && (
        <div className="px-3 py-2 border-b border-stone-800/60 text-xs space-y-0.5">
          {path && (
            <div className="text-gray-400">
              <span className="text-gray-600 mr-1">File</span>
              <code className="text-stone-300 break-all">{path}</code>
            </div>
          )}
          {target && (
            <div className="text-gray-400">
              <span className="text-gray-600 mr-1">Target</span>
              <code className="text-gray-300 break-all">{target}</code>
            </div>
          )}
          {parsed.branch && (
            <div className="text-gray-400">
              <span className="text-gray-600 mr-1">Branch</span>
              <code className="text-gray-300">{parsed.branch}</code>
            </div>
          )}
        </div>
      )}

      {parsed.goal && (
        <div className="px-3 py-2 text-sm text-gray-200 border-b border-stone-800/60">{parsed.goal}</div>
      )}

      {parsed.tasks.length > 0 && (
        <div className="divide-y divide-stone-800/50">
          {parsed.tasks.map((task) => (
            <div key={task.id} className="px-3 py-2 flex items-start gap-2 text-sm">
              <span className="font-mono text-stone-400 text-xs w-8 shrink-0 pt-0.5">{task.id}</span>
              <div className="min-w-0">
                <div className="text-gray-200">{task.title}</div>
                {task.files.length > 0 && (
                  <div className="text-xs text-gray-500 mt-0.5 font-mono truncate">
                    {task.files.join(", ")}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-3 py-1.5 border-t border-stone-800/60 flex items-center">
        <button
          type="button"
          onClick={() => setShowMarkdown((v) => !v)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          {showMarkdown ? "Hide markdown" : "Show markdown"}
        </button>
      </div>

      {showMarkdown && parsed.body && (
        <div className="px-3 py-2 border-t border-stone-800/60 text-sm">
          <MarkdownContent content={parsed.body} />
        </div>
      )}

      {!parsed.tasks.length && !parsed.goal && parsed.body && !showMarkdown && (
        <div className="px-3 py-2 text-sm">
          <MarkdownContent content={parsed.body} />
        </div>
      )}
    </div>
  );
}
