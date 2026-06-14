export default function ConfirmDialog({ type, prompt, confirmed, autoAccepted, onConfirm }) {
  if (type === "confirm_answer") {
    return (
      <div className="flex items-center gap-2 text-sm py-1">
        <span className={confirmed ? "text-emerald-400" : "text-red-400"}>
          {confirmed ? "✓" : "✗"}
        </span>
        <span className="text-gray-400">{prompt}</span>
        <span className={confirmed ? "text-emerald-400" : "text-red-400"}>
          {confirmed ? "Confirmed" : "Cancelled"}
        </span>
        {autoAccepted && (
          <span
            className="text-amber-500/70 text-xs ml-1"
            title="You picked 'Yes (all)' — remaining destructive ops in this run will be auto-confirmed"
          >
            (Yes-all)
          </span>
        )}
      </div>
    );
  }

  if (type === "confirm_auto_accepted") {
    return (
      <div className="flex items-center gap-2 text-sm py-1">
        <span className="text-amber-400">⚡</span>
        <span className="text-gray-400">{prompt}</span>
        <span className="text-amber-400">Auto-confirmed</span>
      </div>
    );
  }

  return (
    <div className="border border-amber-700 rounded-lg overflow-hidden">
      <div className="px-3 py-1.5 bg-amber-950/50 border-b border-amber-800 text-amber-400 text-xs font-medium">
        Confirmation Required
      </div>
      <div className="px-3 py-3 flex items-center justify-between gap-4">
        <span className="text-sm text-gray-200">{prompt}</span>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onConfirm(false)}
            className="px-3 py-1 text-xs font-medium text-gray-300 bg-gray-800 border border-gray-700
                       rounded hover:bg-gray-700 transition-colors"
          >
            No
          </button>
          <button
            type="button"
            onClick={() => onConfirm(true)}
            className="px-3 py-1 text-xs font-medium text-white bg-amber-600
                       rounded hover:bg-amber-500 transition-colors"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onConfirm(true, { autoAccept: true })}
            className="px-3 py-1 text-xs font-medium text-amber-200 bg-amber-800
                       rounded hover:bg-amber-700 transition-colors"
            title="Auto-confirm all remaining destructive operations for this response"
          >
            Yes (all)
          </button>
        </div>
      </div>
    </div>
  );
}
