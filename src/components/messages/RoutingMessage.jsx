import { useEffect, useRef, useState } from "react";
import { formatElapsed } from "../../lib/formatTime";

const BUILT_IN_MODES = [
  "chat",
  "agent",
  "search",
  "web_search",
  "logs",
  "discover",
  "sql",
  "coding",
  "review",
  "research",
  "scheduler",
  "monitor",
  "pipeline",
];

export default function RoutingMessage({
  type,
  profile,
  reason,
  elapsed,
  confidence,
  available_modes,
  available_custom_aliases,
  onReroute,
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (type === "routing") {
    return null;
  }

  const isClickable = !!onReroute;
  const modes =
    Array.isArray(available_modes) && available_modes.length ? available_modes : BUILT_IN_MODES;
  const customAliases = Array.isArray(available_custom_aliases) ? available_custom_aliases : [];

  const confColor =
    confidence === "low"
      ? "text-amber-400"
      : confidence === "medium"
        ? "text-yellow-400"
        : "text-indigo-400";

  const handlePick = (newMode) => {
    setOpen(false);
    if (newMode && newMode !== profile && onReroute) {
      onReroute(newMode);
    }
  };

  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm">
      <span className="text-emerald-400 font-medium">✓</span>
      <div className="relative">
        <span className="text-gray-300">
          Router →{" "}
          {isClickable ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className={`${confColor} font-medium hover:underline focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-0.5`}
              title="Wrong mode? Click to re-run with a different one."
            >
              [{profile}]
            </button>
          ) : (
            <span className={`${confColor} font-medium`}>[{profile}]</span>
          )}
        </span>
        <span className="text-gray-500 ml-2">in {formatElapsed(elapsed)}</span>
        {reason && <span className="text-gray-500 ml-1">— {reason}</span>}

        {open && isClickable && (
          <div
            ref={popoverRef}
            className="absolute z-20 mt-1 left-0 w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-1 max-h-72 overflow-y-auto"
          >
            <div className="px-2 py-1 text-xs text-gray-500 uppercase tracking-wide">
              Re-route as
            </div>
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handlePick(m)}
                disabled={m === profile}
                className={`w-full text-left px-2 py-1 rounded text-sm ${
                  m === profile ? "text-gray-600 cursor-default" : "text-gray-200 hover:bg-gray-800"
                }`}
              >
                @{m}
                {m === profile && <span className="text-gray-600 ml-1">(current)</span>}
              </button>
            ))}
            {customAliases.length > 0 && (
              <>
                <div className="px-2 py-1 mt-1 text-xs text-gray-500 uppercase tracking-wide border-t border-gray-800">
                  Custom agents
                </div>
                {customAliases.map((alias) => (
                  <button
                    key={alias}
                    type="button"
                    onClick={() => handlePick(alias)}
                    className="w-full text-left px-2 py-1 rounded text-sm text-gray-200 hover:bg-gray-800"
                  >
                    @{alias}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
