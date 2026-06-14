export default function ContextWarning({ contextUsage, onCompact, disabled }) {
  if (!contextUsage) {
    return null;
  }

  const { percent, message_count } = contextUsage;

  if (percent < 50) {
    return null;
  }

  const isWarning = percent >= 75 && percent < 90;
  const isCritical = percent >= 90;

  const barColor = isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-indigo-500";
  const textColor = isCritical ? "text-red-400" : isWarning ? "text-amber-400" : "text-gray-400";
  const borderColor = isCritical
    ? "border-red-500/30"
    : isWarning
      ? "border-amber-500/20"
      : "border-gray-700/50";

  return (
    <div className={`mx-auto max-w-5xl px-6 pb-1`}>
      <div
        className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${borderColor}
                     bg-gray-800/60 backdrop-blur-sm`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`flex-shrink-0 ${textColor}`}
        >
          {isCritical ? (
            <>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </>
          ) : (
            <>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </>
          )}
        </svg>

        <div className="flex-1 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
          <span className={`text-xs whitespace-nowrap ${textColor}`}>
            {percent.toFixed(0)}% context
            <span className="text-gray-500 ml-1">
              ({message_count} msg{message_count !== 1 ? "s" : ""})
            </span>
          </span>
        </div>

        {isCritical && (
          <button
            type="button"
            onClick={onCompact}
            disabled={disabled}
            className="px-3 py-1 text-xs font-medium rounded-md transition-colors
                       bg-red-600/80 text-white hover:bg-red-500
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Compact session
          </button>
        )}
      </div>
    </div>
  );
}
