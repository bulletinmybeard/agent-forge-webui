import { useEffect, useRef, useState } from "react";

// Single-letter type badge (A = anchor, N = note, F = file, U = url, # = tag).
const TYPE_ICONS = {
  file: "F",
  url: "U",
  anchor: "A",
  tag: "#",
  note: "N",
};

const TypeBadge = ({ type }) => {
  return (
    <span className="text-xs font-mono text-slate-500 uppercase mr-1.5 shrink-0 w-3 text-center">
      {TYPE_ICONS[type] ?? type?.[0]?.toUpperCase() ?? "?"}
    </span>
  );
};

export const CanvasItem = ({ item, sessionId, onDelete, onUpdateNote }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content ?? item.label ?? "");
  const inputRef = useRef(null);

  const isNote = item.type === "note";

  const anchorTarget =
    item.type === "anchor" && item.content?.startsWith("msg-") ? item.content : null;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== (item.content ?? item.label ?? "")) {
      onUpdateNote(item.id, trimmed);
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft(item.content ?? item.label ?? "");
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleDoubleClick = () => {
    if (isNote) setEditing(true);
  };

  const handleFootnoteClick = (e) => {
    if (!anchorTarget) return;
    const el = document.getElementById(anchorTarget);
    if (!el) return;
    e.preventDefault();
    const url = new URL(window.location.href);
    url.hash = anchorTarget;
    window.history.replaceState(null, "", url.toString());
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const renderContent = () => {
    if (editing) {
      return (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 bg-slate-700 text-slate-100 text-xs rounded px-1 py-0.5 outline-none border border-indigo-500"
        />
      );
    }

    if (item.type === "url" && item.content) {
      return (
        <a
          href={item.content}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0 truncate text-xs text-blue-400 hover:text-blue-300 hover:underline"
          title={item.content}
        >
          {item.label || item.content}
        </a>
      );
    }

    return (
      <span
        className="flex-1 min-w-0 truncate text-xs text-slate-300"
        title={item.label || item.content}
      >
        {item.label || item.content}
      </span>
    );
  };

  return (
    <div
      className="group flex items-center gap-1.5 px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-750 transition-colors"
      onDoubleClick={handleDoubleClick}
    >
      {anchorTarget ? (
        <a
          href={`/chat/${sessionId}#${anchorTarget}`}
          onClick={handleFootnoteClick}
          className="text-xs font-mono text-indigo-400 hover:text-indigo-300 hover:underline shrink-0 w-5 text-right"
          title="Jump to the source message"
        >
          [{item.footnote_num ?? "?"}]
        </a>
      ) : (
        <span className="text-xs font-mono text-slate-500 shrink-0 w-5 text-right">
          [{item.footnote_num ?? "?"}]
        </span>
      )}

      <TypeBadge type={item.type} />

      {renderContent()}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
        className="shrink-0 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none px-0.5"
        aria-label="Remove item"
        title="Remove"
      >
        x
      </button>
    </div>
  );
};
