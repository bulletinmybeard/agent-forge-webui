// Picker mode: what to show on load, and which mode a transcript actually ran.

const UI_MODE_ALIAS = {
  web_search: "web",
  discovery: "discover",
};

// Not "agentforge:mode-draft". ChatView still deletes that legacy key on
// every per-session write, which would wipe the unsent-prompt mode.
export const MODE_DRAFT_KEY = "agentforge:composer-mode";

export const sessionIdFromPath = (pathname) => {
  const match = (pathname || "").match(/^\/chat\/([^/]+)/);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

// Draft wins only while an unsent prompt is still in the composer.
// Otherwise an existing session uses its stored mode, and a new chat starts at chat.
export const initialPickerMode = ({ sessionId, promptDraft, modeDraft, sessionMode }) => {
  if (promptDraft && modeDraft) return modeDraft;
  if (sessionId && sessionMode) return sessionMode;
  return "chat";
};

export const resolveModeId = (raw, aliasToMode) => {
  if (!raw || !aliasToMode) return null;
  let value = String(raw).trim().toLowerCase();
  if (!value) return null;
  if (value.startsWith("@")) value = value.slice(1);
  if (value.startsWith("custom:")) value = value.slice("custom:".length);
  value = UI_MODE_ALIAS[value] || value;
  return aliasToMode[value] || null;
};

// Latest turn wins. `config.mode` is the mode that ran. `routed.profile` is
// often the model profile name, so it is only used when it is a real mode id.
export const detectModeFromMessages = (messages, aliasToMode) => {
  if (!Array.isArray(messages)) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!msg) continue;
    if (msg.type === "config" && msg.mode) {
      const id = resolveModeId(msg.mode, aliasToMode);
      if (id) return id;
    }
    if (msg.type === "routed") {
      const reason = msg.reason || "";
      const at = reason.match(/^@(\w+)/);
      if (at) {
        const id = resolveModeId(at[1], aliasToMode);
        if (id) return id;
      }
      const profile = (msg.profile || "").toLowerCase();
      if (profile === "builder") {
        const id = reason.toLowerCase().startsWith("build") ? "build" : "plan";
        if (aliasToMode[id]) return aliasToMode[id];
      }
      const id = resolveModeId(msg.profile, aliasToMode);
      if (id) return id;
    }
  }
  return null;
};
