import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { filterModes, groupModes, modeHandle, readRecentModeIds } from "../lib/modePicker";

// mb-2 under the popover, plus the same gap under the viewport top.
const POPOVER_CLEARANCE = 16;
const LIST_MAX = 420;

const oneLine = (text) => (text || "").replace(/\s+/g, " ").trim();

const ModeSelector = ({ modes, selected, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recentIds, setRecentIds] = useState(readRecentModeIds);
  const ref = useRef(null);
  const listRef = useRef(null);
  const chromeRef = useRef(null);
  const [popoverMax, setPopoverMax] = useState(null);
  const [listMax, setListMax] = useState(LIST_MAX);
  const current = modes.find((mode) => mode.id === selected) || modes[0];
  const isChat = selected === "chat";

  const searching = query.trim().length > 0;
  const sections = useMemo(() => {
    if (!searching) return groupModes(modes);
    const items = filterModes(modes, query);
    if (items.length === 0) return [];
    const label = items.length === 1 ? "1 result" : `${items.length} results`;
    return [{ label, items }];
  }, [modes, query, searching]);

  const flat = useMemo(() => sections.flatMap((section) => section.items), [sections]);
  const activeIndex = flat.length === 0 ? 0 : Math.min(active, flat.length - 1);

  const byId = useMemo(() => new Map(modes.map((mode) => [mode.id, mode])), [modes]);
  const recent = searching ? [] : recentIds.map((id) => byId.get(id)).filter(Boolean);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  const openPicker = () => {
    setQuery("");
    setActive(0);
    setRecentIds(readRecentModeIds());
    setOpen(true);
  };

  const choose = (id) => {
    onChange(id);
    close();
  };

  useEffect(() => {
    if (disabled && open) close();
  }, [disabled, open, close]);

  useEffect(() => {
    if (!open) return;
    const handle = (event) => {
      if (ref.current && !ref.current.contains(event.target)) close();
    };
    const handleKey = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, close]);

  // The empty-chat composer sits mid-window. A fixed list height then
  // pushes the search row past the top of the viewport. Cap the panel
  // at the space above the trigger; the list scrolls inside that.
  useLayoutEffect(() => {
    if (!open) return;
    let frame = 0;
    const measure = () => {
      const node = ref.current;
      if (node) {
        const available = Math.max(
          0,
          Math.floor(node.getBoundingClientRect().top - POPOVER_CLEARANCE),
        );
        const chrome = chromeRef.current?.offsetHeight ?? 0;
        const nextList = Math.max(0, Math.min(LIST_MAX, available - chrome));
        setPopoverMax((prev) => (prev === available ? prev : available));
        setListMax((prev) => (prev === nextList ? prev : nextList));
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // query re-filters the list, so the row at activeIndex becomes a different mode.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run on filter change
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const el = list?.querySelector(`[data-idx="${activeIndex}"]`);
    if (!list || !el) return;
    const elRect = el.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    if (elRect.top < listRect.top) {
      list.scrollTop -= listRect.top - elRect.top + 8;
    } else if (elRect.bottom > listRect.bottom) {
      list.scrollTop += elRect.bottom - listRect.bottom + 8;
    }
  }, [activeIndex, open, query]);

  const onSearchKey = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (flat.length === 0) return;
      setActive(Math.min(flat.length - 1, activeIndex + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (flat.length === 0) return;
      setActive(Math.max(0, activeIndex - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      if (flat[activeIndex]) choose(flat[activeIndex].id);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  let rowIndex = 0;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => !disabled && (open ? close() : openPicker())}
        disabled={disabled}
        title="Select mode"
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium
                    transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                    ${
                      isChat
                        ? "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                        : `bg-gray-800 border-gray-600 ${current?.text || "text-gray-300"} hover:border-gray-500`
                    }`}
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${current?.dot || "bg-gray-500"}`} />
        <span>{current?.label || "Mode"}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute bottom-full mb-2 left-0 z-50 flex flex-col overflow-hidden
                     bg-gray-900 border border-gray-700 rounded-xl shadow-2xl"
          style={{ width: "min(calc(100vw - 48px), 560px)", maxHeight: popoverMax ?? undefined }}
        >
          <div ref={chromeRef}>
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-800">
              <span className="font-mono text-sm text-gray-500">@</span>
              <input
                type="text"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={onSearchKey}
                placeholder="Search modes or what they do…"
                aria-label="Search modes"
                aria-controls="mode-picker-list"
                aria-activedescendant={
                  flat[activeIndex] ? `mode-opt-${flat[activeIndex].id}` : undefined
                }
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm text-gray-100
                           placeholder:text-gray-500"
              />
              <span className="font-mono text-[10px] text-gray-500 border border-gray-700 rounded px-1.5 py-0.5">
                esc
              </span>
            </div>

            {recent.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap px-3 py-2.5 border-b border-gray-800">
                <span className="mr-1 text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                  Recent
                </span>
                {recent.map((mode) => {
                  const isCurrent = mode.id === selected;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => choose(mode.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border
                                  transition-colors hover:border-gray-500
                                  ${
                                    isCurrent
                                      ? "bg-gray-800 border-gray-600 text-gray-100 font-semibold"
                                      : "bg-gray-900 border-gray-700 text-gray-300 font-normal"
                                  }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${mode.dot}`} />
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div
            id="mode-picker-list"
            ref={listRef}
            role="listbox"
            aria-label="Modes"
            className="overflow-y-auto px-1.5 py-1.5 min-h-0"
            style={{ maxHeight: listMax }}
          >
            {sections.map((section) => (
              <div key={section.label}>
                <div className="px-2.5 pt-2 pb-1 text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                  {section.label}
                </div>
                {section.items.map((mode) => {
                  const index = rowIndex;
                  rowIndex += 1;
                  const isCurrent = mode.id === selected;
                  const isActive = index === activeIndex;
                  const handle = modeHandle(mode);
                  const desc = oneLine(mode.desc);
                  return (
                    <button
                      key={mode.id}
                      id={`mode-opt-${mode.id}`}
                      type="button"
                      role="option"
                      aria-selected={isCurrent}
                      data-idx={index}
                      onMouseMove={() => {
                        if (index !== activeIndex) setActive(index);
                      }}
                      onClick={() => choose(mode.id)}
                      className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-md text-left
                                  ${isActive ? "bg-gray-800" : isCurrent ? "bg-gray-800/60" : ""}`}
                    >
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${mode.dot || "bg-gray-500"}`}
                      />
                      <span className="min-w-0 flex-1 flex flex-col gap-0.5">
                        <span className="flex items-baseline gap-2 min-w-0">
                          <span
                            className={`text-[13px] truncate ${
                              isCurrent
                                ? "font-semibold text-gray-100"
                                : "font-medium text-gray-200"
                            }`}
                          >
                            {mode.label}
                          </span>
                          {handle && (
                            <span className="font-mono text-[11px] text-gray-500 truncate">
                              {handle}
                            </span>
                          )}
                        </span>
                        {desc && <span className="text-xs text-gray-500 truncate">{desc}</span>}
                      </span>
                      <span className="flex items-center mt-0.5 flex-shrink-0">
                        {isCurrent ? (
                          <span
                            className="text-[10px] font-semibold tracking-wide text-indigo-200
                                       bg-gray-800 border border-gray-600 rounded-full px-2 py-0.5"
                          >
                            Current
                          </span>
                        ) : (
                          isActive && <span className="text-xs text-gray-500 px-1">↵</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
            {searching && flat.length === 0 && (
              <div className="px-2.5 py-4 text-sm text-gray-500">No mode matches.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModeSelector;
