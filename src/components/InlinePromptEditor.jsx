import { useCallback, useEffect, useRef, useState } from "react";

export default function InlinePromptEditor({ initialText = "", onSave, onCancel }) {
  const [text, setText] = useState(initialText);
  const textareaRef = useRef(null);

  useEffect(() => {
    const t = textareaRef.current;
    if (!t) return;
    t.focus();
    t.setSelectionRange(t.value.length, t.value.length);
  }, []);

  const canSave = text.trim().length > 0 && text.trim() !== initialText.trim();

  const handleSave = useCallback(() => {
    if (!canSave) return;
    onSave?.(text.trim());
  }, [canSave, onSave, text]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
      }
    },
    [handleSave, onCancel],
  );

  return (
    <div className="flex flex-col gap-1 w-full">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={Math.min(14, Math.max(5, text.split("\n").length + 1))}
        className="w-full min-h-[7rem] bg-gray-900 border border-gray-700 rounded px-3 py-2
                   text-gray-200 text-sm font-mono resize-y focus:outline-none
                   focus:border-indigo-500"
      />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-gray-200 bg-transparent
                     border-0 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="text-xs text-indigo-400 hover:text-indigo-200 bg-transparent
                     border-0 cursor-pointer disabled:opacity-50
                     disabled:cursor-not-allowed"
        >
          Save &amp; retry
        </button>
      </div>
    </div>
  );
}
