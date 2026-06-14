import { useRef, useState } from "react";
import { CanvasItem } from "./CanvasItem";

export const CanvasPanel = ({
  sessionId,
  items,
  isOpen,
  onClose,
  onAddNote,
  onDeleteItem,
  onUpdateNote,
  width = 340,
  onResizeStart,
}) => {
  const [noteText, setNoteText] = useState("");
  const inputRef = useRef(null);

  if (!isOpen) {
    return null;
  }

  const submitNote = () => {
    const trimmed = noteText.trim();
    if (!trimmed) {
      return;
    }
    onAddNote(trimmed);
    setNoteText("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitNote();
    }
  };

  return (
    <div
      className="absolute top-0 bottom-0 flex flex-col z-[51]"
      style={{ right: "0", width: `${width}px`, borderLeft: "2px solid rgb(99 102 241)" }}
    >
      <div className="absolute inset-0 bg-slate-900" />
      <div
        onMouseDown={onResizeStart}
        className="absolute top-0 bottom-0 left-0 w-1.5 z-[60] cursor-ew-resize hover:bg-indigo-500/40"
        title="Drag to resize"
      />

      <div className="relative flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 shrink-0">
          <span className="text-xs font-semibold text-indigo-300 tracking-wide">
            Session Canvas
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-sm leading-none px-1"
            aria-label="Close canvas"
          >
            x
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 min-h-0">
          {items.length === 0 ? (
            <p className="text-xs text-slate-600 text-center pt-4">No items yet</p>
          ) : (
            items.map((item) => (
              <CanvasItem
                key={item.id}
                item={item}
                sessionId={sessionId}
                onDelete={onDeleteItem}
                onUpdateNote={onUpdateNote}
              />
            ))
          )}
        </div>

        <div className="shrink-0 border-t border-slate-700 px-2 py-2 flex gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add note..."
            className="flex-1 min-w-0 bg-slate-800 text-slate-200 text-xs rounded px-2 py-1.5 outline-none border border-slate-700 focus:border-indigo-500 placeholder-slate-600"
          />
          <button
            type="button"
            onClick={submitNote}
            disabled={!noteText.trim()}
            className="shrink-0 px-2 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-white font-medium transition-colors"
            aria-label="Add note"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};
