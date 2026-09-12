import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ConnectorsModal from "../connectors/components/ConnectorsModal";
import { useCanvas } from "../hooks/useCanvas";
import useModes from "../hooks/useModes";
import BookmarksModal from "./BookmarksModal";
import { CanvasPanel } from "./CanvasPanel";
import { CanvasTab } from "./CanvasTab";
import ChatInput from "./ChatInput";
import CommandPermissionsModal from "./CommandPermissionsModal";
import MemorySettings from "./MemorySettings";
import MessageList from "./MessageList";
import ConfirmDialog from "./messages/ConfirmDialog";
import SecretDialog from "./messages/SecretDialog";
import ProfileModal from "./ProfileModal";

const WelcomeGreeting = () => {
  const [welcome, setWelcome] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/welcome")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setWelcome(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!welcome) {
    return <p className="text-gray-500 text-lg mb-6">What can I help you with?</p>;
  }

  return (
    <div className="text-center mb-6">
      <p className="text-gray-300 text-xl font-light">{welcome.headline}</p>
      {welcome.subtitle && <p className="text-gray-500 text-sm mt-1">{welcome.subtitle}</p>}
    </div>
  );
};

// Per-session only — new chats must not inherit the previous mode/overrides.
const MODE_PREFIX = "agentforge:mode:";
const PROFILE_OVERRIDES_PREFIX = "agentforge:profile-overrides:";
// Legacy global key (pre per-session mode draft) — cleared on write.
const MODE_DRAFT_LEGACY_KEY = "agentforge:mode-draft";
const PROFILE_OVERRIDES_PENDING_LEGACY = `${PROFILE_OVERRIDES_PREFIX}pending`;

const readSessionMode = (sessionId) => {
  if (!sessionId) return "chat";
  try {
    return localStorage.getItem(`${MODE_PREFIX}${sessionId}`) || "chat";
  } catch {
    return "chat";
  }
};

const writeSessionMode = (sessionId, modeId) => {
  if (!sessionId) return;
  try {
    // Drop legacy global draft so it cannot re-infect new chats
    localStorage.removeItem(MODE_DRAFT_LEGACY_KEY);
    const key = `${MODE_PREFIX}${sessionId}`;
    if (modeId && modeId !== "chat") {
      localStorage.setItem(key, modeId);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    /* private mode / quota */
  }
};

const profileOverridesKey = (sessionId) =>
  sessionId ? `${PROFILE_OVERRIDES_PREFIX}${sessionId}` : null;

const readProfileOverrides = (sessionId) => {
  const key = profileOverridesKey(sessionId);
  if (!key) return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const writeProfileOverrides = (sessionId, overrides) => {
  const key = profileOverridesKey(sessionId);
  if (!key) return;
  try {
    // Drop legacy pending key so it cannot re-infect new chats
    localStorage.removeItem(PROFILE_OVERRIDES_PENDING_LEGACY);
    if (overrides && Object.keys(overrides).length > 0) {
      localStorage.setItem(key, JSON.stringify(overrides));
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    /* private mode / quota */
  }
};

const detectModeFromMessages = (messages, aliasToMode) => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.type === "routed" && msg.reason) {
      const match = msg.reason.match(/^@(\w+)/);
      if (match) {
        const alias = match[1].toLowerCase();
        if (aliasToMode[alias]) return aliasToMode[alias];
      }
      const p = (msg.profile || "").toLowerCase();
      if (p === "sql") return "sql";
      if (p === "discovery") return "discover";
      if (p === "review") return "review";
      if (p === "builder") {
        const r = (msg.reason || "").toLowerCase();
        return r.startsWith("build") ? "build" : "plan";
      }
      if (p === "plan") return "plan";
      if (p === "build") return "build";
      if (p.includes("web-search")) return "web";
    }
  }
  return null;
};

export default function ChatView({
  messages,
  connected = true,
  running,
  confirm,
  secret,
  onSendQuery,
  onConfirm,
  onSecret,
  onCancel,
  pendingFiles,
  onFilesAttached,
  onRemoveFile,
  contextUsage,
  onCompactSession,
  agentStatus,
  // Command note props
  savedNoteTsSet,
  onSaveToolCalls,
  onRemoveToolCalls,
  onSaveAnswer,
  onRemoveAnswer,
  // Retry-last-prompt — resends the last query, optionally with edited text
  retryQuery,
  // Re-route — re-run a prompt under a different mode (clickable Router chip)
  rerouteQuery,
  // Incognito mode
  incognito = false,
  setIncognito,
  onToggleIncognito,
  noHistory = false, // backend-driven: active agent has no_history flag
  // Browser notifications
  notificationsEnabled = false,
  onToggleNotifications,
  // Prompt presets
  presets = [],
  // Skills
  availableSkills = [],
  activeMode = null,
  // Upload limits
  uploadLimits,
  // Dynamic session instructions
  instructions = [],
  onDeleteInstruction,
  // Pagination / lazy loading
  hasMoreMessages = false,
  loadingMore = false,
  onLoadMore,
  // Canvas
  canvasEnabled = false,
  // Per-session AI provider
  providers = null,
  selectedProvider = "default",
  onProviderChange,
  sessionProviderOverride = null, // stamped on session row at create time
}) {
  const isEmpty = messages.length === 0 && !running;

  const modes = useModes();
  const validModeIds = useMemo(() => new Set(modes.map((m) => m.id)), [modes]);
  const modePrefixes = useMemo(
    () => Object.fromEntries(modes.map((m) => [m.id, m.prefix])),
    [modes],
  );
  const aliasToMode = useMemo(() => {
    const map = {};
    for (const mode of modes) {
      map[mode.id] = mode.id;
      const tokens = (mode.aliases || "").match(/@(\w+)/g) || [];
      for (const token of tokens) {
        const alias = token.slice(1).toLowerCase();
        if (!map[alias]) map[alias] = mode.id;
      }
    }
    return map;
  }, [modes]);

  const { sessionId } = useParams();

  const canvas = useCanvas({ sessionId, enabled: canvasEnabled });
  const [searchParams] = useSearchParams();
  // Explicit ?mode= in the URL wins; otherwise null so session restore can apply.
  const urlMode = useMemo(() => {
    const param = searchParams.get("mode");
    return param && validModeIds.has(param) ? param : null;
  }, [searchParams, validModeIds]);

  // Always start at chat; session/url effects set the real value.
  const [selectedMode, setSelectedMode] = useState("chat");
  const selectedModeRef = useRef(selectedMode);
  selectedModeRef.current = selectedMode;
  const modeLoadedForRef = useRef(null);

  // Per-session mode restore. New chat (no sessionId) → always "chat".
  // When the first message assigns a session id, keep the mode the user
  // already picked on the blank new-chat screen (don't snap back to chat).
  useEffect(() => {
    const key = sessionId || "__new__";
    if (modeLoadedForRef.current === key) return;
    const prevKey = modeLoadedForRef.current;
    modeLoadedForRef.current = key;

    if (urlMode) {
      setSelectedMode(urlMode);
      return;
    }
    if (!sessionId) {
      setSelectedMode("chat");
      return;
    }
    if (prevKey === "__new__") {
      writeSessionMode(sessionId, selectedModeRef.current);
      return;
    }
    setSelectedMode(readSessionMode(sessionId));
  }, [sessionId, urlMode]);

  // URL mode always wins when present (including mid-session param changes).
  useEffect(() => {
    if (urlMode) setSelectedMode(urlMode);
  }, [urlMode]);

  // Drop a stale mode id once the modes list is known (async load).
  useEffect(() => {
    if (urlMode) return;
    if (validModeIds.size > 0 && !validModeIds.has(selectedMode)) {
      setSelectedMode("chat");
    }
  }, [validModeIds, selectedMode, urlMode]);

  // Persist mode only for an existing session (reload same chat keeps pick).
  useEffect(() => {
    if (!sessionId || urlMode) return;
    writeSessionMode(sessionId, selectedMode);
  }, [sessionId, selectedMode, urlMode]);

  // Existing session with history: prefer mode inferred from last route.
  const modeRestoredForRef = useRef(null);
  useEffect(() => {
    if (searchParams.get("mode")) {
      return;
    }
    if (!sessionId) {
      return;
    }
    if (modeRestoredForRef.current === sessionId) {
      return;
    }
    if (messages.length === 0) {
      modeRestoredForRef.current = sessionId;
      return;
    }

    modeRestoredForRef.current = sessionId;
    const detected = detectModeFromMessages(messages, aliasToMode);
    if (detected && detected !== "chat") {
      setSelectedMode(detected);
    }
  }, [sessionId, messages.length, searchParams, aliasToMode, messages]); // eslint-disable-line react-hooks/exhaustive-deps

  const PRIVATE_MODES = useMemo(() => new Set(["monitor", "scheduler", "cloud", "gitlab"]), []);
  const autoPrivateRef = useRef(false);

  useEffect(() => {
    if (!setIncognito) return;
    const shouldBePrivate = PRIVATE_MODES.has(selectedMode);
    if (shouldBePrivate && !incognito) {
      setIncognito(true);
      autoPrivateRef.current = true;
    } else if (!shouldBePrivate && autoPrivateRef.current) {
      setIncognito(false);
      autoPrivateRef.current = false;
    }
  }, [selectedMode, incognito, setIncognito, PRIVATE_MODES.has]); // eslint-disable-line react-hooks/exhaustive-deps

  const [selectedSkills, setSelectedSkills] = useState([]);
  const [skillsLocked, setSkillsLocked] = useState(false);

  const [profileData, setProfileData] = useState(null);
  const [profileOverrides, setProfileOverrides] = useState({});
  const profileOverridesLoadedFor = useRef(null);
  const skipProfileOverridesSave = useRef(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);

  // Restore profile overrides only for an existing session. New chat → {}.
  useEffect(() => {
    const key = sessionId || "__new__";
    if (profileOverridesLoadedFor.current === key) return;
    profileOverridesLoadedFor.current = key;
    skipProfileOverridesSave.current = true;

    if (sessionId) {
      setProfileOverrides(readProfileOverrides(sessionId));
    } else {
      try {
        localStorage.removeItem(PROFILE_OVERRIDES_PENDING_LEGACY);
      } catch {
        /* ignore */
      }
      setProfileOverrides({});
    }
  }, [sessionId]);

  // Persist after Apply / change so reload of *this* session keeps swaps.
  // Skip the write that follows a load; never write without a session id.
  useEffect(() => {
    if (profileOverridesLoadedFor.current === null) return;
    if (skipProfileOverridesSave.current) {
      skipProfileOverridesSave.current = false;
      return;
    }
    if (!sessionId) return;
    writeProfileOverrides(sessionId, profileOverrides);
  }, [sessionId, profileOverrides]);

  useEffect(() => {
    // include_abstract so the model dropdown also lists concrete cloud
    // models (deepseek, nemotron, kimi-k3, …) that only exist as abstracts.
    fetch("/api/profiles?include_abstract=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setProfileData(data);
      })
      .catch(() => {});
  }, []);

  // Role profiles only in the modal list (default, agent, fast, …).
  const profiles = useMemo(() => {
    if (!profileData?.profiles) return null;
    const out = {};
    for (const [name, prof] of Object.entries(profileData.profiles)) {
      if (!prof.abstract) out[name] = prof;
    }
    return out;
  }, [profileData]);

  // Model picker: every resolved model string, including abstracts.
  const allModels = useMemo(() => {
    if (!profileData?.profiles) return [];
    const seen = new Set();
    Object.values(profileData.profiles).forEach(({ model }) => {
      if (model) seen.add(model);
    });
    return [...seen].sort();
  }, [profileData]);

  const handleSend = (text) => {
    const prefix = modePrefixes[selectedMode] || "";
    const finalText = prefix && !text.trimStart().startsWith("@") ? prefix + text : text;
    onSendQuery(finalText, [], "auto", profileOverrides);
  };

  const inputProps = {
    onSend: handleSend,
    disabled: running,
    running,
    connected,
    onCancel,
    profiles,
    onOpenProfiles: () => setModalOpen(true),
    onOpenMemory: () => setMemoryOpen(true),
    onOpenConnectors: () => setConnectorsOpen(true),
    onOpenPermissions: () => setPermissionsOpen(true),
    onOpenBookmarks: () => setBookmarksOpen(true),
    pendingFiles,
    onFilesAttached,
    onRemoveFile,
    contextUsage,
    onCompactSession,
    modes,
    selectedMode,
    onModeChange: setSelectedMode,
    incognito,
    onToggleIncognito,
    noHistory,
    notificationsEnabled,
    onToggleNotifications,
    presets,
    availableSkills,
    activeMode,
    selectedSkills,
    onSkillsChange: setSelectedSkills,
    skillsLocked,
    onSkillsLocked: setSkillsLocked,
    uploadLimits,
    instructions,
    onDeleteInstruction,
    providers,
    selectedProvider,
    onProviderChange,
    providerLocked: !!sessionProviderOverride || messages.length > 0,
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      {isEmpty ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6">
          <WelcomeGreeting />
          <div className="w-full max-w-6xl">
            <ChatInput {...inputProps} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <MessageList
            messages={messages}
            running={running}
            confirm={confirm}
            onConfirm={onConfirm}
            secret={secret}
            agentStatus={agentStatus}
            savedNoteTsSet={savedNoteTsSet}
            onSaveToolCalls={onSaveToolCalls}
            onRemoveToolCalls={onRemoveToolCalls}
            onSaveAnswer={onSaveAnswer}
            onRemoveAnswer={onRemoveAnswer}
            onRerun={
              !running ? (query) => onSendQuery(query, [], "auto", profileOverrides) : undefined
            }
            retryQuery={
              retryQuery
                ? (promptText, editedText) => retryQuery(promptText, editedText, profileOverrides)
                : undefined
            }
            rerouteQuery={rerouteQuery}
            hasMoreMessages={hasMoreMessages}
            loadingMore={loadingMore}
            onLoadMore={onLoadMore}
            onPinAnchor={canvasEnabled ? canvas.addAnchor : undefined}
          />
          {confirm && (
            <div className="shrink-0 px-4 pb-2 max-w-6xl w-full mx-auto">
              <ConfirmDialog type="confirm_prompt" prompt={confirm.prompt} onConfirm={onConfirm} />
            </div>
          )}
          {secret && (
            <div className="shrink-0 px-4 pb-2 max-w-6xl w-full mx-auto">
              <SecretDialog type="secret_prompt" prompt={secret.prompt} onSubmit={onSecret} />
            </div>
          )}
          <ChatInput {...inputProps} />
        </div>
      )}

      {canvasEnabled && (
        <>
          <CanvasTab
            itemCount={canvas.items.length}
            isOpen={canvas.isOpen}
            onToggle={canvas.toggle}
            width={canvas.width}
          />
          <CanvasPanel
            sessionId={sessionId}
            items={canvas.items}
            isOpen={canvas.isOpen}
            onClose={canvas.close}
            onAddNote={canvas.addNote}
            onDeleteItem={canvas.deleteItem}
            onUpdateNote={canvas.updateNote}
            width={canvas.width}
            onResizeStart={canvas.startResize}
          />
        </>
      )}

      <ProfileModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        profiles={profiles}
        overrides={profileOverrides}
        onSave={setProfileOverrides}
        allModels={allModels}
      />

      <MemorySettings open={memoryOpen} onClose={() => setMemoryOpen(false)} />

      <ConnectorsModal open={connectorsOpen} onClose={() => setConnectorsOpen(false)} />

      <CommandPermissionsModal open={permissionsOpen} onClose={() => setPermissionsOpen(false)} />

      <BookmarksModal open={bookmarksOpen} onClose={() => setBookmarksOpen(false)} />
    </div>
  );
}
