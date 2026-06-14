import { formatElapsed } from "../../lib/formatTime";

export default function CancelledMessage({ elapsed }) {
  return (
    <div className="flex items-center gap-2 text-sm text-amber-400 py-1">
      <span className="text-base">⏹</span>
      <span>
        Cancelled
        {elapsed > 0 && (
          <span className="text-gray-500 ml-1.5">after {formatElapsed(elapsed)}</span>
        )}
      </span>
    </div>
  );
}
