import { useEffect, useRef, useState } from "react";

function QueueActions({ onCancel, onRunNow }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Queued prompt actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="px-2 py-0.5 text-gray-400 hover:text-gray-200 rounded"
      >
        ...
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-1 z-20 min-w-32 rounded-md border border-gray-700 bg-gray-900 py-1 shadow-lg">
          <button
            type="button"
            className="block w-full text-left px-3 py-1 text-xs text-gray-200 hover:bg-gray-800"
            onClick={() => {
              setOpen(false);
              onRunNow();
            }}
          >
            Run now
          </button>
          <button
            type="button"
            className="block w-full text-left px-3 py-1 text-xs text-gray-200 hover:bg-gray-800"
            onClick={() => {
              setOpen(false);
              onCancel();
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function rowLabel(item) {
  if (item.text) return item.text;
  const names = (item.attachments || []).map((file) => file.name).filter(Boolean);
  return names.length ? names.join(", ") : "(empty prompt)";
}

export default function PromptQueue({ items, onCancel, onRunNow }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-col gap-1 mb-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/80 px-3 py-1.5 text-sm text-gray-300"
        >
          <span className="text-[10px] uppercase tracking-wide text-gray-500 shrink-0">Queued</span>
          <span className="truncate flex-1">{rowLabel(item)}</span>
          <QueueActions onCancel={() => onCancel(item.id)} onRunNow={() => onRunNow(item.id)} />
        </div>
      ))}
    </div>
  );
}
