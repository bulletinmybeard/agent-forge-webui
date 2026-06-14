import { useEffect, useRef, useState } from "react";

export default function ProviderSelector({
  providers,
  selected,
  onChange,
  locked = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (locked) {
    const lockedLabel =
      selected && selected !== "default"
        ? selected
        : providers?.default
          ? `Default (${providers.default})`
          : "Default";
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-gray-400
                   bg-gray-900 border border-gray-700 rounded-lg cursor-not-allowed
                   whitespace-nowrap max-w-[180px]"
        title="Provider locked for this session — start a new chat to switch"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="flex-shrink-0 opacity-70"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <span className="truncate">{lockedLabel}</span>
      </div>
    );
  }

  if (!providers) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-gray-500
                      bg-gray-800 border border-gray-700 rounded-lg"
      >
        <span>...</span>
      </div>
    );
  }

  const configured = providers.configured || [];
  const defaultLabel = providers.default ? `Default (${providers.default})` : "Default";

  const choices = [
    { value: "default", label: defaultLabel, hint: "Use server default" },
    ...configured.map((p) => ({ value: p, label: p, hint: null })),
  ];

  const currentLabel = (() => {
    if (!selected || selected === "default") return defaultLabel;
    return selected;
  })();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-gray-400 bg-gray-800
                   border border-gray-700 rounded-lg hover:border-gray-600 hover:text-gray-300
                   transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                   whitespace-nowrap max-w-[180px]"
        title="Pick the AI provider for this chat (locks once first message is sent)"
      >
        <span className="truncate">{currentLabel}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute bottom-full mb-2 left-0 w-64 z-50
                     bg-gray-900 border border-gray-700 rounded-xl shadow-2xl
                     p-2 max-h-72 overflow-y-auto"
        >
          <div className="flex flex-col gap-1">
            {choices.map((c) => {
              const isActive = c.value === (selected || "default");
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    onChange(c.value);
                    setOpen(false);
                  }}
                  className={`flex flex-col items-start gap-0.5 px-2.5 py-1.5 rounded-lg text-left
                              transition-colors border w-full
                              ${
                                isActive
                                  ? "bg-gray-800 border-gray-600"
                                  : "bg-gray-800/40 border-transparent hover:bg-gray-800 hover:border-gray-700"
                              }`}
                >
                  <span
                    className={`text-xs font-medium truncate w-full ${
                      isActive ? "text-indigo-400" : "text-gray-200"
                    }`}
                  >
                    {c.label}
                  </span>
                  {c.hint && (
                    <span className="text-[10px] text-gray-500 truncate w-full">{c.hint}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
