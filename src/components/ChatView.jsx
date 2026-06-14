import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ConnectorsModal from "../connectors/components/ConnectorsModal";
import { useCanvas } from "../hooks/useCanvas";
import useModes from "../hooks/useModes";
import BookmarksModal from "./BookmarksModal";
import { CanvasPanel } from "./CanvasPanel";
import { CanvasTab } from "./CanvasTab";
import ChatInput from "./ChatInput";
import MemorySettings from "./MemorySettings";
import MessageList from "./MessageList";
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
      if (p.includes("web-search")) return "web";
    }
  }
  return null;
};

export default function ChatView({
  messages,
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
  const urlMode = useMemo(() => {
    const param = searchParams.get("mode");
    return param && validModeIds.has(param) ? param : "chat";
  }, [searchParams, validModeIds]);

  const [selectedMode, setSelectedMode] = useState(urlMode);
  useEffect(() => {
    setSelectedMode(urlMode);
  }, [urlMode]);

  const modeRestoredForRef = useRef(null);
  useEffect(() => {
    if (searchParams.get("mode")) {
      return;
    }
    if (modeRestoredForRef.current === sessionId) {
      return;
    }
    if (messages.length === 0) {
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
  const [modalOpen, setModalOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setProfileData(data);
      })
      .catch(() => {});
  }, []);

  const profiles = profileData?.profiles;

  const allModels = useMemo(() => {
    if (!profiles) return [];
    const seen = new Set();
    Object.values(profiles).forEach(({ model }) => {
      seen.add(model);
    });
    return [...seen].sort();
  }, [profiles]);

  const handleSend = (text) => {
    const prefix = modePrefixes[selectedMode] || "";
    const finalText = prefix && !text.trimStart().startsWith("@") ? prefix + text : text;
    onSendQuery(finalText, [], "auto", profileOverrides);
  };

  const inputProps = {
    onSend: handleSend,
    disabled: running,
    running,
    onCancel,
    profiles,
    onOpenProfiles: () => setModalOpen(true),
    onOpenMemory: () => setMemoryOpen(true),
    onOpenConnectors: () => setConnectorsOpen(true),
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
            onSecret={onSecret}
            agentStatus={agentStatus}
            savedNoteTsSet={savedNoteTsSet}
            onSaveToolCalls={onSaveToolCalls}
            onRemoveToolCalls={onRemoveToolCalls}
            onSaveAnswer={onSaveAnswer}
            onRemoveAnswer={onRemoveAnswer}
            onRerun={
              !running ? (query) => onSendQuery(query, [], "auto", profileOverrides) : undefined
            }
            retryQuery={retryQuery}
            rerouteQuery={rerouteQuery}
            hasMoreMessages={hasMoreMessages}
            loadingMore={loadingMore}
            onLoadMore={onLoadMore}
            onPinAnchor={canvasEnabled ? canvas.addAnchor : undefined}
          />
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

      <BookmarksModal open={bookmarksOpen} onClose={() => setBookmarksOpen(false)} />
    </div>
  );
}
