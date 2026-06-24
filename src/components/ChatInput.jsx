import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HelpModal from "./HelpModal";
import ProviderSelector from "./ProviderSelector";

const PROMPT_DRAFT_KEY = "agentforge:prompt-draft";

const OFFLINE_GRACE_MS = 3000;

const dragHasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes("Files");

const BLOCKED_UPLOAD_EXTS = new Set([
  ".html",
  ".htm",
  ".xhtml",
  ".xht",
  ".shtml",
  ".svg",
  ".svgz",
  ".xml",
  ".js",
  ".mjs",
  ".swf",
  ".vbs",
]);
const extOf = (name) => {
  const i = (name || "").lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
};

export default function ChatInput({
  onSend,
  disabled,
  running,
  connected = true,
  onCancel,
  onOpenProfiles,
  onOpenMemory,
  onOpenConnectors,
  onOpenBookmarks,
  pendingFiles = [],
  onFilesAttached,
  onRemoveFile,
  contextUsage,
  onCompactSession,
  selectedMode = "chat",
  onModeChange,
  modes = [],
  incognito = false,
  onToggleIncognito,
  noHistory = false,
  notificationsEnabled = false,
  onToggleNotifications,
  presets = [],
  // Skills
  availableSkills = [],
  activeMode = null,
  selectedSkills = [],
  onSkillsChange,
  skillsLocked = false,
  onSkillsLocked,
  // Upload limits
  uploadLimits,
  // Dynamic session instructions
  instructions = [],
  onDeleteInstruction,
  // Per-session AI provider
  providers = null,
  selectedProvider = "default",
  onProviderChange,
  providerLocked = false,
}) {
  const [text, setText] = useState(() => localStorage.getItem(PROMPT_DRAFT_KEY) || "");
  const [helpOpen, setHelpOpen] = useState(false);
  const [showOffline, setShowOffline] = useState(false);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (connected) {
      setShowOffline(false);
      return;
    }
    const t = setTimeout(() => setShowOffline(true), OFFLINE_GRACE_MS);
    return () => clearTimeout(t);
  }, [connected]);

  const offline = showOffline;
  const busyOrOffline = disabled || offline;

  useEffect(() => {
    if (text) localStorage.setItem(PROMPT_DRAFT_KEY, text);
    else localStorage.removeItem(PROMPT_DRAFT_KEY);
  }, [text]);

  const historyRef = useRef([]);
  const historyIdxRef = useRef(-1);
  const draftRef = useRef("");

  const hasFiles = pendingFiles.length > 0;
  const stillUploading = pendingFiles.some((pf) => pf.status === "uploading");
  const _hasErrors = pendingFiles.some((pf) => pf.status === "error");

  const limits = uploadLimits || {};
  const maxFileSize = limits.max_file_size_bytes || 75 * 1024 * 1024;
  const maxFiles = limits.max_files_per_request || 25;
  const totalAttachedBytes = pendingFiles.reduce((sum, pf) => sum + (pf.file?.size || 0), 0);
  const fileCount = pendingFiles.length;
  const atFileLimit = fileCount >= maxFiles;

  const CHARS_PER_TOKEN = 4;
  const IMAGE_TOKEN_ESTIMATE = 85;
  const PDF_TEXT_DENSITY = 0.25;
  const _TEXT_SUFFIXES = new Set([
    ".txt",
    ".md",
    ".csv",
    ".json",
    ".yaml",
    ".yml",
    ".xml",
    ".html",
    ".log",
  ]);

  const estimatedNewTokens = useMemo(() => {
    let tokens = Math.ceil((text || "").length / CHARS_PER_TOKEN);
    for (const pf of pendingFiles) {
      const name = pf.file?.name || "";
      const ext = name.includes(".") ? `.${name.split(".").pop().toLowerCase()}` : "";
      const isImage = pf.file?.type?.startsWith("image/");
      if (isImage) {
        tokens += IMAGE_TOKEN_ESTIMATE;
      } else if (ext === ".pdf") {
        tokens += Math.ceil(((pf.file?.size || 0) * PDF_TEXT_DENSITY) / CHARS_PER_TOKEN);
      } else if (_TEXT_SUFFIXES.has(ext)) {
        tokens += Math.ceil((pf.file?.size || 0) / CHARS_PER_TOKEN);
      }
    }
    return tokens;
  }, [text, pendingFiles, _TEXT_SUFFIXES.has]);

  const fallbackContextTokens = limits.default_context_tokens || 32_768;
  const maxTokens = contextUsage?.max_tokens || fallbackContextTokens;
  const usedTokens = contextUsage?.used_tokens || 0;
  const remainingTokens = maxTokens - usedTokens;
  const wouldExceedContext = estimatedNewTokens > remainingTokens;
  const contextPercent = Math.min(((usedTokens + estimatedNewTokens) / maxTokens) * 100, 100);
  const attachDisabled = busyOrOffline || atFileLimit || wouldExceedContext;

  const autoResize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto"; // reset to measure scrollHeight
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if ((!trimmed && !hasFiles) || busyOrOffline || stillUploading) return;
    if (wouldExceedContext) {
      setAttachError(
        `Content too large for context window — estimated ${estimatedNewTokens.toLocaleString()} tokens but only ~${remainingTokens.toLocaleString()} remaining. Remove attachments or shorten your prompt.`,
      );
      return;
    }
    if (trimmed && historyRef.current[historyRef.current.length - 1] !== trimmed) {
      historyRef.current.push(trimmed);
    }
    historyIdxRef.current = -1;
    draftRef.current = "";
    localStorage.removeItem(PROMPT_DRAFT_KEY);
    onSend(trimmed);
    setText("");
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    });
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
      return;
    }

    const el = inputRef.current;
    if (e.key === "ArrowUp" && historyRef.current.length > 0) {
      const hasNewlines = text.includes("\n");
      const atStart = el && el.selectionStart === 0 && el.selectionEnd === 0;
      if (!hasNewlines && (atStart || text === "")) {
        e.preventDefault();
        const hist = historyRef.current;
        if (historyIdxRef.current === -1) {
          draftRef.current = text;
          historyIdxRef.current = hist.length - 1;
        } else if (historyIdxRef.current > 0) {
          historyIdxRef.current--;
        }
        setText(hist[historyIdxRef.current]);
        requestAnimationFrame(autoResize);
      }
    } else if (e.key === "ArrowDown" && historyIdxRef.current !== -1) {
      const hasNewlines = text.includes("\n");
      const atEnd = el && el.selectionStart === text.length;
      if (!hasNewlines && (atEnd || text === "")) {
        e.preventDefault();
        const hist = historyRef.current;
        if (historyIdxRef.current < hist.length - 1) {
          historyIdxRef.current++;
          setText(hist[historyIdxRef.current]);
        } else {
          historyIdxRef.current = -1;
          setText(draftRef.current);
        }
        requestAnimationFrame(autoResize);
      }
    }
  };

  const handlePresetSelect = (e) => {
    const name = e.target.value;
    e.target.value = "";
    if (!name) {
      return;
    }
    const preset = presets.find((p) => p.name === name);
    if (!preset) {
      return;
    }
    if (preset.mode && onModeChange) {
      const matched = modes.find((m) => m.prefix.trim() === preset.mode);
      if (matched) onModeChange(matched.id);
    }
    setText(preset.message);
    requestAnimationFrame(autoResize);
    inputRef.current?.focus();
  };

  const skillAliasMap = useMemo(() => {
    const map = new Map();
    for (const skill of availableSkills) {
      for (const alias of skill.aliases || []) {
        map.set(alias.toLowerCase(), skill.id);
      }
    }
    return map;
  }, [availableSkills]);

  const prefixMap = useMemo(() => {
    const map = new Map();
    for (const mode of modes) {
      if (mode.prefix) map.set(mode.prefix.toLowerCase(), mode.id);
      const tokens = (mode.aliases || "").match(/@\w+/g) || [];
      for (const token of tokens) {
        const key = `${token.toLowerCase()} `;
        if (!map.has(key)) map.set(key, mode.id);
      }
    }
    return map;
  }, [modes]);

  const handleInput = (e) => {
    const newText = e.target.value;
    if (onModeChange && newText.includes(" ")) {
      const lower = newText.toLowerCase();
      for (const [prefix, modeId] of prefixMap) {
        if (prefix && lower.startsWith(prefix)) {
          onModeChange(modeId);
          const rest = newText.slice(prefix.length);
          setText(rest);
          _detectSkillAliases(rest);
          requestAnimationFrame(autoResize);
          return;
        }
      }
    }
    setText(newText);
    _detectSkillAliases(newText);
    autoResize();
  };

  const _detectSkillAliases = (text) => {
    if (!onSkillsChange || !text.includes(" ") || skillAliasMap.size === 0) return;
    const lower = text.toLowerCase();
    const detected = new Set();
    for (const [alias, skillId] of skillAliasMap) {
      if (lower.includes(`${alias} `) || lower.endsWith(alias)) {
        detected.add(skillId);
      }
    }
    if (detected.size > 0) {
      onSkillsChange([...detected]);
      if (onSkillsLocked) onSkillsLocked(true);
    } else if (skillsLocked) {
      onSkillsChange([]);
      if (onSkillsLocked) onSkillsLocked(false);
    }
  };

  const [attachError, setAttachError] = useState(null);

  const addFiles = useCallback(
    (fileList) => {
      const incoming = Array.from(fileList || []);
      if (incoming.length === 0) return;
      setAttachError(null);

      const blocked = incoming.filter((f) => BLOCKED_UPLOAD_EXTS.has(extOf(f.name)));
      const selected = incoming.filter((f) => !BLOCKED_UPLOAD_EXTS.has(extOf(f.name)));
      const skippedNote =
        blocked.length > 0
          ? `Skipped ${blocked.length} file${blocked.length > 1 ? "s" : ""} — SVG/HTML/script types aren't allowed: ${blocked.map((f) => f.name).join(", ")}`
          : "";

      if (selected.length === 0) {
        if (skippedNote) setAttachError(skippedNote);
        return;
      }

      const remainingSlots = maxFiles - fileCount;
      if (selected.length > remainingSlots) {
        setAttachError(
          `Cannot attach ${selected.length} file${selected.length > 1 ? "s" : ""} — only ${remainingSlots} slot${remainingSlots !== 1 ? "s" : ""} remaining (max ${maxFiles})`,
        );
        return;
      }

      const oversized = selected.filter((f) => f.size > maxFileSize);
      if (oversized.length > 0) {
        const names = oversized.map((f) => f.name).join(", ");
        setAttachError(
          `File${oversized.length > 1 ? "s" : ""} too large (max ${limits.max_file_size_mb || 75} MB): ${names}`,
        );
        return;
      }

      if (skippedNote) setAttachError(skippedNote);
      onFilesAttached?.(selected);
    },
    [onFilesAttached, maxFiles, maxFileSize, fileCount, limits.max_file_size_mb],
  );

  const handleFileSelect = useCallback(
    (e) => {
      addFiles(e.target.files);
      e.target.value = "";
    },
    [addFiles],
  );

  const handlePaste = useCallback(
    (e) => {
      const dt = e.clipboardData;
      if (!dt) return;
      const files = [];
      const seen = new Set();
      const add = (f) => {
        if (!f) return;
        const key = `${f.name}:${f.size}:${f.lastModified}`;
        if (seen.has(key)) return;
        seen.add(key);
        files.push(f);
      };
      for (const f of Array.from(dt.files || [])) add(f);
      for (const item of Array.from(dt.items || [])) {
        if (item.kind === "file") add(item.getAsFile());
      }
      if (files.length > 0) {
        e.preventDefault();
        addFiles(files);
      }
    },
    [addFiles],
  );

  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);
  const handleDragEnter = useCallback((e) => {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    dragDepth.current += 1;
    setDragActive(true);
  }, []);
  const handleDragOver = useCallback((e) => {
    if (dragHasFiles(e)) e.preventDefault();
  }, []);
  const handleDragLeave = useCallback((e) => {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  }, []);
  const handleDrop = useCallback(
    (e) => {
      if (!dragHasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragActive(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const [previews, setPreviews] = useState({});
  useEffect(() => {
    const urls = {};
    const created = [];
    pendingFiles.forEach((pf, i) => {
      if (pf.result?.url) {
        urls[i] = pf.result.url;
      } else if (pf.file?.type?.startsWith("image/") && pf.file.size > 0) {
        const u = URL.createObjectURL(pf.file);
        urls[i] = u;
        created.push(u);
      }
    });
    setPreviews(urls);
    return () => {
      created.forEach((u) => {
        URL.revokeObjectURL(u);
      });
    };
  }, [pendingFiles]);

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const imageFiles = pendingFiles
    .map((pf, i) => [pf, i])
    .filter(([pf]) => pf.file.type.startsWith("image/"));
  const nonImageFiles = pendingFiles
    .map((pf, i) => [pf, i])
    .filter(([pf]) => !pf.file.type.startsWith("image/"));

  return (
    <div className="py-3 pb-5">
      <div
        className="max-w-6xl mx-auto px-6 relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dragActive && (
          <div className="pointer-events-none absolute inset-0 z-20 m-1 flex items-center justify-center rounded-xl border-2 border-dashed border-indigo-500 bg-gray-900/80 backdrop-blur-sm">
            <span className="text-sm font-medium text-indigo-300">Drop files to attach</span>
          </div>
        )}
        {imageFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {imageFiles.map(([pf, i]) => (
              <div
                key={`img-${pf.file.name}-${i}`}
                className={`relative group w-16 h-16 rounded-lg overflow-hidden border flex-shrink-0
                           bg-gray-800 ${pf.status === "error" ? "border-red-500" : pf.status === "uploading" ? "border-indigo-500" : "border-gray-700"}`}
              >
                <img
                  src={previews[i]}
                  alt={pf.file.name}
                  className={`w-full h-full object-cover ${pf.status === "uploading" ? "opacity-50" : ""}`}
                />
                {pf.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {pf.status === "ready" && (
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-[8px]">✓</span>
                  </div>
                )}
                {pf.status === "error" && (
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-[8px]">!</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveFile?.(i)}
                  className="absolute top-0 right-0 bg-black/70 text-gray-300 hover:text-white
                             rounded-bl-md px-1 py-0.5 text-xs opacity-0 group-hover:opacity-100
                             transition-opacity"
                  title="Remove"
                >
                  ✕
                </button>
                <div
                  className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] text-gray-300
                                px-1 py-0.5 truncate"
                >
                  {pf.file.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {nonImageFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {nonImageFiles.map(([pf, i]) => (
              <span
                key={`${pf.file.name}-${i}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 border
                           rounded-lg text-xs text-gray-300
                           ${pf.status === "error" ? "border-red-500" : pf.status === "uploading" ? "border-indigo-500" : "border-gray-700"}`}
              >
                {pf.status === "uploading" ? (
                  <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : pf.status === "error" ? (
                  <span className="text-red-400 text-xs" title={pf.error}>
                    ⚠
                  </span>
                ) : pf.status === "ready" ? (
                  <span className="text-green-400 text-xs">✓</span>
                ) : (
                  <FileIcon contentType={pf.file.type} />
                )}
                <span className="max-w-[160px] truncate">{pf.file.name}</span>
                <span className="text-gray-500">{formatSize(pf.result?.size ?? pf.file.size)}</span>
                <button
                  type="button"
                  onClick={() => onRemoveFile?.(i)}
                  className="ml-0.5 text-gray-500 hover:text-gray-300 transition-colors"
                  title="Remove file"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {attachError && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 mb-1 rounded-lg
                          bg-red-950/40 border border-red-800/40 text-red-300 text-xs"
          >
            <span className="flex-shrink-0">⚠</span>
            <span className="flex-1">{attachError}</span>
            <button
              type="button"
              onClick={() => setAttachError(null)}
              className="text-red-400 hover:text-red-200 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {(hasFiles || wouldExceedContext) && (
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-0.5">
            {hasFiles && (
              <>
                <span>
                  {fileCount}/{maxFiles} files
                </span>
                <span>{formatSize(totalAttachedBytes)}</span>
              </>
            )}
            {maxTokens > 0 && estimatedNewTokens > 0 && (
              <span
                className={
                  wouldExceedContext
                    ? "text-red-400 font-medium"
                    : contextPercent > 80
                      ? "text-amber-400"
                      : "text-gray-500"
                }
              >
                ~{estimatedNewTokens.toLocaleString()} tokens
                {wouldExceedContext
                  ? ` — exceeds remaining ${remainingTokens.toLocaleString()}`
                  : ` / ${remainingTokens.toLocaleString()} remaining`}
              </span>
            )}
            {atFileLimit && <span className="text-amber-400 font-medium">File limit reached</span>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 mt-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex items-center gap-2">
            {onModeChange && (
              <ModeSelector
                modes={modes}
                selected={selectedMode}
                onChange={onModeChange}
                disabled={busyOrOffline}
              />
            )}

            {onProviderChange && (providers || providerLocked) && (
              <ProviderSelector
                providers={providers}
                selected={selectedProvider}
                onChange={onProviderChange}
                locked={providerLocked}
                disabled={busyOrOffline}
              />
            )}

            {presets.length > 0 &&
              (() => {
                const grouped = presets.reduce((acc, p) => {
                  const key = p.group || null;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(p);
                  return acc;
                }, {});
                const hasGroups = Object.keys(grouped).some((k) => k !== "null" && k !== null);
                return (
                  <select
                    onChange={handlePresetSelect}
                    defaultValue=""
                    disabled={busyOrOffline}
                    title="Insert a saved prompt preset"
                    className="px-2 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-sm
                             rounded-lg hover:border-gray-600 focus:outline-none cursor-pointer
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>
                      Presets
                    </option>
                    {hasGroups
                      ? Object.entries(grouped).map(([group, items]) =>
                          group && group !== "null" ? (
                            <optgroup key={group} label={group}>
                              {items.map((p) => (
                                <option key={p.name} value={p.name}>
                                  {p.name}
                                </option>
                              ))}
                            </optgroup>
                          ) : (
                            items.map((p) => (
                              <option key={p.name} value={p.name}>
                                {p.name}
                              </option>
                            ))
                          ),
                        )
                      : presets.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                  </select>
                );
              })()}

            {availableSkills.length > 0 && (
              <SkillSelector
                skills={availableSkills}
                selected={selectedSkills}
                onChange={onSkillsChange}
                locked={skillsLocked}
                disabled={busyOrOffline}
                activeMode={activeMode}
              />
            )}

            <div className="flex-1" />

            {onToggleIncognito && (
              <button
                type="button"
                onClick={onToggleIncognito}
                disabled={
                  busyOrOffline ||
                  noHistory ||
                  selectedMode === "monitor" ||
                  selectedMode === "scheduler" ||
                  selectedMode === "cloud" ||
                  selectedMode === "gitlab"
                }
                title={
                  noHistory || selectedMode === "cloud" || selectedMode === "gitlab"
                    ? "Private session auto-enabled — this agent doesn\u2019t store cross-session history"
                    : selectedMode === "monitor" || selectedMode === "scheduler"
                      ? "Private session auto-enabled for this mode"
                      : incognito
                        ? "Private session active — click to disable"
                        : "Enable private session (no history forwarded)"
                }
                className={`p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                           ${
                             incognito
                               ? "text-violet-400 bg-violet-900/30 border border-violet-600/50 hover:bg-violet-900/50"
                               : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
            )}

            {onToggleNotifications && (
              <button
                type="button"
                onClick={onToggleNotifications}
                disabled={offline}
                title={
                  notificationsEnabled
                    ? "Desktop notifications enabled — click to disable"
                    : "Enable desktop notifications when runs complete"
                }
                className={`p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                           ${
                             notificationsEnabled
                               ? "text-amber-400 bg-amber-900/30 border border-amber-600/50 hover:bg-amber-900/50"
                               : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill={notificationsEnabled ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              </button>
            )}

            {onOpenProfiles && (
              <button
                type="button"
                onClick={onOpenProfiles}
                disabled={busyOrOffline}
                title="Edit profile overrides"
                className="p-2 text-gray-400 hover:text-gray-200 bg-gray-800 border border-gray-700
                           rounded-lg hover:border-gray-600 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </button>
            )}

            {onOpenMemory && (
              <button
                type="button"
                onClick={onOpenMemory}
                disabled={offline}
                title="Memory — stored facts and recalled exchanges"
                className="p-2 text-gray-400 hover:text-gray-200 bg-gray-800 border border-gray-700
                           rounded-lg hover:border-gray-600 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a7 7 0 00-7 7v3a5 5 0 005 5h4a5 5 0 005-5V9a7 7 0 00-7-7z" />
                  <path d="M9 12h6M12 9v6" />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenConnectors?.()}
              disabled={offline}
              title="Connectors — Gmail, Drive, and other services"
              className="p-2 text-gray-400 hover:text-gray-200 bg-gray-800 border border-gray-700
                         rounded-lg hover:border-gray-600 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => onOpenBookmarks?.()}
              disabled={offline}
              title="Bookmarks — saved tool calls and answers"
              className="p-2 text-gray-400 hover:text-gray-200 bg-gray-800 border border-gray-700
                         rounded-lg hover:border-gray-600 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              disabled={offline}
              title="Cheat sheet — modes & tools"
              className="p-2 text-gray-400 hover:text-gray-200 bg-gray-800 border border-gray-700
                         rounded-lg hover:border-gray-600 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>

            <div className="w-[112px] flex-shrink-0" />
          </div>

          {incognito && (
            <div className="flex items-center gap-2">
              <div
                className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg
                              bg-violet-950/40 border border-violet-800/40 text-violet-300 text-xs"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0 opacity-70"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                <span>
                  {noHistory || selectedMode === "cloud" || selectedMode === "gitlab"
                    ? "Private session — follow-ups work within this chat, but nothing is stored cross-session"
                    : "Private session — prompts and responses are not stored in chat history"}
                </span>
              </div>
              <div className="w-[112px] flex-shrink-0" />
            </div>
          )}

          <div className="flex items-end gap-2 mt-1 mb-1">
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                offline
                  ? "Disconnected — reconnecting to AgentForge…"
                  : disabled
                    ? "Agent is working..."
                    : stillUploading
                      ? "Uploading files..."
                      : hasFiles
                        ? `${pendingFiles.length} file${pendingFiles.length > 1 ? "s" : ""} attached — add a message...`
                        : noHistory || selectedMode === "cloud" || selectedMode === "gitlab"
                          ? "Private session — follow-ups work, cross-session history skipped..."
                          : incognito
                            ? "Private session — no history forwarded to the AI..."
                            : selectedMode === "chat"
                              ? "Ask the agent..."
                              : `${modes.find((m) => m.id === selectedMode)?.label} mode — describe your task...`
              }
              disabled={busyOrOffline}
              autoFocus
              className={`flex-1 px-3 py-2 bg-gray-800 rounded-lg
                         text-gray-100 placeholder-gray-500
                         focus:outline-none
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-sm resize-none overflow-y-auto leading-relaxed
                         ${
                           incognito
                             ? "border border-violet-600/70 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                             : "border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
}`}
              style={{ maxHeight: 200 }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachDisabled}
              title={
                atFileLimit
                  ? `File limit reached (${maxFiles} files)`
                  : `Attach files (${fileCount}/${maxFiles})`
              }
              className={`p-2 transition-colors rounded-lg
                         disabled:opacity-40 disabled:cursor-not-allowed
                         ${
                           atFileLimit && !disabled
                             ? "text-amber-500 hover:text-amber-400"
                             : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            {running && onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg
                           hover:bg-red-500 transition-colors"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={
                  busyOrOffline ||
                  stillUploading ||
                  wouldExceedContext ||
                  (!text.trim() && !hasFiles)
                }
                title={wouldExceedContext ? "Content exceeds model context window" : undefined}
                className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed
                           ${
                             wouldExceedContext && !disabled
                               ? "bg-red-700 hover:bg-red-600"
                               : incognito
                                 ? "bg-violet-600 hover:bg-violet-500"
                                 : "bg-indigo-600 hover:bg-indigo-500"
}`}
              >
                {stillUploading ? "Uploading…" : wouldExceedContext ? "Too large" : "Send"}
              </button>
            )}
          </div>
        </form>

        {instructions.length > 0 && (
          <InstructionsBar instructions={instructions} onDelete={onDeleteInstruction} />
        )}

        <div className="pr-[120px]">
          <ContextBar
            contextUsage={contextUsage || { percent: 0, message_count: 0 }}
            onCompact={onCompactSession}
            disabled={busyOrOffline}
          />
        </div>

        {offline && (
          <div
            className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg
                       bg-red-950/40 border border-red-800/40 text-red-300 text-xs"
          >
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="flex-1">Not connected to AgentForge! Reconnecting…</span>
          </div>
        )}
      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

const ModeTile = ({ mode, selected, onSelect }) => {
  const isActive = mode.id === selected;
  const firstAlias = (mode.aliases || "").match(/@\w+/)?.[0] || mode.prefix?.trim() || "";
  return (
    <button
      type="button"
      onClick={() => onSelect(mode.id)}
      className={`flex flex-col items-start gap-0.5 px-2.5 py-1.5 rounded-lg text-left
                  transition-colors border
                  ${
                    isActive
                      ? `bg-gray-800 border-gray-600 ${mode.text}`
                      : "bg-gray-800/40 border-transparent hover:bg-gray-800 hover:border-gray-700"
                  }`}
    >
      <div className="flex items-center gap-1.5 w-full">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${mode.dot}`} />
        <span className={`text-xs font-medium truncate ${isActive ? mode.text : "text-gray-300"}`}>
          {mode.label}
        </span>
        {isActive && <span className="ml-auto text-[9px] text-gray-500">✓</span>}
      </div>
      {firstAlias && (
        <span className="text-[10px] font-mono text-gray-600 pl-3.5 truncate w-full">
          {firstAlias}
        </span>
      )}
    </button>
  );
};

const ModeSelector = ({ modes, selected, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = modes.find((m) => m.id === selected) || modes[0];
  const isChat = selected === "chat";

  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        title="Select mode"
        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium
                    transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                    ${
                      isChat
                        ? "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                        : `bg-gray-800 border-gray-600 ${current.text} hover:border-gray-500`
                    }`}
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${current.dot}`} />
        <span>{current.label}</span>
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
          className="absolute bottom-full mb-2 left-0 z-50
                     bg-gray-900 border border-gray-700 rounded-xl shadow-2xl
                     p-2 overflow-hidden"
          style={{ width: "min(calc(100vw - 48px), 820px)" }}
        >
          <div className="grid grid-cols-7 gap-1.5">
            {modes
              .filter((mode) => !mode.connector)
              .map((mode) => (
                <ModeTile
                  key={mode.id}
                  mode={mode}
                  selected={selected}
                  onSelect={(id) => {
                    onChange(id);
                    setOpen(false);
                  }}
                />
              ))}
          </div>
          {modes.some((mode) => mode.connector) && (
            <>
              <div className="flex items-center gap-2 mt-3 mb-1.5 px-0.5">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                  Connections
                </span>
                <span className="flex-1 h-px bg-gray-800" />
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {modes
                  .filter((mode) => mode.connector)
                  .map((mode) => (
                    <ModeTile
                      key={mode.id}
                      mode={mode}
                      selected={selected}
                      onSelect={(id) => {
                        onChange(id);
                        setOpen(false);
                      }}
                    />
                  ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const SkillSelector = ({
  skills,
  selected = [],
  onChange,
  locked = false,
  disabled = false,
  activeMode = null,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const count = selected.length;
  const hasSelection = count > 0;

  const isDisabledByMode = (skill) => {
    if (!activeMode || !skill.disable_for_modes) return false;
    return skill.disable_for_modes.includes(activeMode);
  };

  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const toggleSkill = (id) => {
    if (locked || !onChange) return;
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    onChange(next);
  };

  const clearAll = () => {
    if (locked || !onChange) return;
    onChange([]);
  };

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        title={
          locked
            ? `Skills auto-detected: ${selected.join(", ")} — click to view`
            : hasSelection
              ? `${count} skill${count > 1 ? "s" : ""} selected`
              : "Select skills (optional)"
        }
        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium
                    transition-colors disabled:cursor-not-allowed
                    ${
                      locked
                        ? "bg-purple-900/30 border-purple-600/50 text-purple-300 hover:border-purple-400"
                        : hasSelection
                          ? "bg-purple-900/20 border-purple-600/40 text-purple-300 hover:border-purple-500"
                          : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                    }
                    ${disabled ? "opacity-40" : ""}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0"
        >
          <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
        </svg>
        <span>{hasSelection ? `Skills (${count})` : "Skills"}</span>
        {locked && (
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
            className="opacity-60"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        )}
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
          className="absolute bottom-full mb-2 left-0 z-50
                     bg-gray-900 border border-gray-700 rounded-xl shadow-2xl
                     p-2 w-72"
        >
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <span className="text-xs text-gray-400 font-medium">Available Skills</span>
            {hasSelection && !locked && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
          {locked && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 mb-1.5 rounded-lg
                            bg-purple-950/40 border border-purple-800/30 text-purple-300 text-[10px]"
            >
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
                className="flex-shrink-0 opacity-70"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span>Auto-detected from prompt — locked for this query</span>
            </div>
          )}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {skills.map((skill) => {
              const isActive = selected.includes(skill.id);
              const modeDisabled = isDisabledByMode(skill);
              const isClickable = !locked && !modeDisabled;
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => isClickable && toggleSkill(skill.id)}
                  disabled={locked || modeDisabled}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left
                              transition-colors border
                              ${!isClickable ? "cursor-default" : "cursor-pointer"}
                              ${
                                modeDisabled
                                  ? "bg-gray-800/10 border-transparent opacity-40"
                                  : isActive
                                    ? "bg-purple-900/30 border-purple-600/40"
                                    : locked
                                      ? "bg-gray-800/20 border-transparent"
                                      : "bg-gray-800/40 border-transparent hover:bg-gray-800 hover:border-gray-700"
                              }`}
                >
                  <div
                    className={`w-4 h-4 mt-0.5 rounded border flex-shrink-0 flex items-center justify-center
                                  ${
                                    modeDisabled
                                      ? "bg-gray-800 border-gray-700 opacity-30"
                                      : isActive
                                        ? locked
                                          ? "bg-purple-700 border-purple-600 opacity-70"
                                          : "bg-purple-600 border-purple-500"
                                        : locked
                                          ? "bg-gray-800 border-gray-700 opacity-50"
                                          : "bg-gray-800 border-gray-600"
                                  }`}
                  >
                    {isActive && !modeDisabled && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-medium ${
                          modeDisabled
                            ? "text-gray-600"
                            : isActive
                              ? "text-purple-200"
                              : locked
                                ? "text-gray-500"
                                : "text-gray-300"
                        }`}
                      >
                        {skill.id}
                      </span>
                      {modeDisabled && (
                        <span className="text-[10px] text-amber-600/70 font-medium">
                          covered by @{activeMode.replace("custom:", "")}
                        </span>
                      )}
                      {!modeDisabled && skill.aliases?.length > 0 && (
                        <span className="text-[10px] text-gray-600 font-mono">
                          {skill.aliases[0]}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[11px] mt-0.5 leading-snug ${
                        modeDisabled
                          ? "text-gray-700"
                          : locked && !isActive
                            ? "text-gray-600"
                            : "text-gray-500"
                      }`}
                    >
                      {skill.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const InstructionsBar = ({ instructions, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const count = instructions.length;

  return (
    <div className="mt-1 text-[11px]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors"
        title="Active session instructions — set via #remember"
      >
        <span className="text-indigo-500">✦</span>
        <span>
          {count} instruction{count !== 1 ? "s" : ""} active
        </span>
        <span className={`transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {expanded && (
        <ul className="mt-1.5 space-y-1 pl-1">
          {instructions.map((instr) => (
            <li key={instr.id} className="flex items-start gap-2 group">
              <span
                className={`flex-1 leading-snug ${
                  instr.scope === "global" ? "text-gray-500" : "text-gray-300"
                }`}
              >
                {instr.text}
                {instr.scope === "global" && <span className="ml-1 text-gray-600">(global)</span>}
              </span>
              <button
                type="button"
                onClick={() => onDelete?.(instr.id)}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-600
                           hover:text-red-400 transition-all mt-0.5"
                title="Remove this instruction"
              >
                ×
              </button>
            </li>
          ))}
          <li className="text-gray-600 pt-0.5">
            Use <code className="text-gray-500">#forget</code> to clear all session instructions
          </li>
        </ul>
      )}
    </div>
  );
};

const _fmtTokens = (n) => {
  if (!n || n <= 0) return "~";
  if (n < 1000) return String(n);
  if (n < 100_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
};

const ContextBar = ({ contextUsage, onCompact, disabled }) => {
  const { percent, message_count, token_usage } = contextUsage || { percent: 0, message_count: 0 };
  const isCritical = percent >= 90;
  const isWarning = percent >= 75;
  const showLabel = percent >= 10;
  const hasTokens = token_usage != null;
  const barColor = isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-indigo-500/60";
  const textColor = isCritical ? "text-red-400" : isWarning ? "text-amber-400" : "text-gray-500";

  return (
    <div className="mt-1.5">
      <div className="h-[3px] bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      {(showLabel || hasTokens) && (
        <div className={`flex items-center justify-between mt-1 text-[11px] ${textColor}`}>
          <span>
            {showLabel && (
              <>
                {percent.toFixed(0)}% context
                <span className="text-gray-600 ml-1">
                  · {message_count} msg{message_count !== 1 ? "s" : ""}
                </span>
              </>
            )}
            {hasTokens && (
              <span
                className="text-gray-600 ml-1"
                title={
                  token_usage.total_tokens > 0
                    ? `Prompt: ${(token_usage.prompt_tokens || 0).toLocaleString()} · Completion: ${(token_usage.completion_tokens || 0).toLocaleString()} · Total: ${token_usage.total_tokens.toLocaleString()}`
                    : "Token counts not available — model didn't report usage"
                }
              >
                · {_fmtTokens(token_usage.total_tokens)} tokens (
                {_fmtTokens(token_usage.prompt_tokens)} in ·{" "}
                {_fmtTokens(token_usage.completion_tokens)} out)
              </span>
            )}
          </span>
          {isCritical && onCompact && (
            <button
              type="button"
              onClick={onCompact}
              disabled={disabled}
              className="text-red-400 hover:text-red-300 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Compact session
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const FileIcon = ({ contentType }) => {
  const type = contentType || "";
  let icon = "📄";
  if (type.startsWith("image/")) icon = "🖼";
  else if (type.startsWith("video/")) icon = "🎬";
  else if (type.startsWith("audio/")) icon = "🎵";
  else if (type.includes("pdf")) icon = "📕";
  else if (type.includes("zip") || type.includes("tar") || type.includes("gzip")) icon = "📦";
  else if (type.includes("json") || type.includes("javascript") || type.includes("xml"))
    icon = "📋";
  return <span className="text-xs">{icon}</span>;
};
