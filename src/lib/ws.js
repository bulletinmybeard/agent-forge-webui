/**
 * AgentWS — WebSocket client for the AgentForge backend.
 *
 * Provides:
 * - Session-aware connections (optional ?session_id= query param)
 * - Auto-reconnection (5s delay)
 * - Heartbeat ping/pong (30s interval)
 * - Event emitter pattern (on/off/emit)
 *
 * Usage:
 *   import ws from "./ws"
 *   ws.on("agent.result", (msg) => console.log(msg.text))
 *   ws.connect({ sessionId: "abc-123" })
 *   ws.sendQuery("Hello world", "abc-123")
 */

class AgentWS {
  constructor() {
    this.ws = null;
    this.listeners = {};
    this.pingInterval = null;
    this.reconnectTimeout = null;
    this._intentionalClose = false;
    this._sessionId = null;
    this._outbox = [];
    this._connectTimer = null;
  }

  /**
   * Get the WebSocket URL based on current location.
   * Appends ?session_id=... if a session ID is provided.
   */
  _getUrl(sessionId) {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    let url = `${proto}//${location.host}/ws/chat`;
    if (sessionId) {
      url += `?session_id=${encodeURIComponent(sessionId)}`;
    }
    return url;
  }

  /**
   * Connect to the WebSocket server.
   * @param {Object} opts - Connection options
   * @param {string} [opts.sessionId] - Session ID to resume (appended as query param)
   */
  connect(opts = {}) {
    const sid = opts.sessionId || null;

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) &&
      this._sessionId === sid
    ) {
      return;
    }

    // Cancel any pending reconnect from a previous socket
    clearTimeout(this.reconnectTimeout);

    // Disconnect existing connection first if any
    if (this.ws) {
      // Detach old handlers to prevent orphaned onclose from triggering reconnect
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    this._intentionalClose = false;
    this._sessionId = opts.sessionId || null;
    const url = this._getUrl(this._sessionId);
    this.ws = new WebSocket(url);
    const sock = this.ws;

    clearTimeout(this._connectTimer);
    this._connectTimer = setTimeout(() => {
      if (sock.readyState === WebSocket.CONNECTING) {
        sock.close();
      }
    }, 6000);

    this.ws.onopen = () => {
      clearTimeout(this._connectTimer);
      this._reconnectAttempts = 0; // reset backoff on successful connect
      this.emit("connected");
      this._startPing();
      this._flushOutbox();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.emit(msg.type, msg);
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onerror = () => {
      this.emit("error");
    };

    this.ws.onclose = () => {
      this._stopPing();
      this.emit("disconnected");
      if (!this._intentionalClose) {
        this._scheduleReconnect();
      }
    };
  }

  disconnect() {
    this._intentionalClose = true;
    this._stopPing();
    clearTimeout(this._connectTimer);
    clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      // Detach handlers before closing to prevent orphaned onclose from firing
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Update the session ID used for reconnects.
   * Call this after the client generates/receives a session ID so that
   * auto-reconnect re-establishes the same session.
   */
  setSessionId(sessionId) {
    this._sessionId = sessionId || null;
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // -- Sending messages ---------------------------------------------------

  _send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return;
    }
    if (data?.type !== "ping") {
      this._outbox.push(data);
    }
    if (!this.ws || this.ws.readyState >= WebSocket.CLOSING) {
      this.connect({ sessionId: this._sessionId });
    }
  }

  _flushOutbox() {
    if (!this._outbox.length) return;
    const queued = this._outbox;
    this._outbox = [];
    for (const m of queued) {
      try {
        this.ws.send(JSON.stringify(m));
      } catch {
        this._outbox.push(m);
      }
    }
  }

  /**
   * Send a query to the agent.
   * @param {string} text - The query text
   * @param {string} [sessionId] - Session ID to include in the message
   * @param {Array} [attachments] - Uploaded file metadata [{name, path, size, content_type}]
   * @param {Object} [overrides] - Optional { model, profiles: { name: { model, temperature } } }
   */
  sendQuery(text, sessionId, attachments, overrides) {
    const msg = { type: "query", text };
    if (sessionId) msg.session_id = sessionId;
    if (attachments && attachments.length > 0) msg.attachments = attachments;
    if (overrides) msg.overrides = overrides;
    this._send(msg);
  }

  /**
   * Retry the last prompt in the given session.
   * Server verifies that *promptText* matches the most recent user query,
   * deletes the prompt + everything after it, scrubs semantic memory,
   * and re-runs either *promptText* or *editedText*.
   */
  retryQuery(sessionId, promptText, editedText) {
    const msg = { type: "query.retry", prompt_text: promptText };
    if (sessionId) msg.session_id = sessionId;
    if (editedText !== undefined && editedText !== null) {
      msg.edited_text = editedText;
    }
    this._send(msg);
  }

  /**
   * Re-run the original query under a different mode. User clicked the
   * Router → [mode] chip and picked a different mode than the
   * classifier chose. The server logs the override to classifier_audit
   * (a "ground truth" label) before re-running.
   *
   * @param {string} sessionId
   * @param {string} originalText - the original prompt (without @-prefix)
   * @param {string} originalMode - what the classifier picked first
   * @param {string} newMode - what the user picked instead
   */
  rerouteQuery(sessionId, originalText, originalMode, newMode) {
    const msg = {
      type: "query.reroute",
      original_text: originalText,
      original_mode: originalMode,
      new_mode: newMode,
    };
    if (sessionId) msg.session_id = sessionId;
    this._send(msg);
  }

  sendConfirmResponse(requestId, confirmed, { autoAccept = false } = {}) {
    const msg = {
      type: "confirm.response",
      request_id: requestId,
      confirmed,
    };
    if (autoAccept) msg.auto_accept = true;
    this._send(msg);
  }

  sendSecretResponse(requestId, value, cancelled = false) {
    const msg = { type: "secret.response", request_id: requestId };
    if (cancelled || value == null) msg.cancelled = true;
    else msg.value = value;
    this._send(msg);
  }

  sendCancel() {
    this._send({ type: "cancel" });
  }

  sendCompactSession() {
    this._send({ type: "compact_session" });
  }

  // -- Event emitter ------------------------------------------------------

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  emit(event, data) {
    const cbs = this.listeners[event];
    if (cbs) {
      cbs.forEach((cb) => {
        try {
          cb(data);
        } catch {
          // Don't let listener errors break the event loop
        }
      });
    }
  }

  // -- Heartbeat ----------------------------------------------------------

  _startPing() {
    this._stopPing();
    this.pingInterval = setInterval(() => {
      this._send({ type: "ping" });
    }, 30_000);
  }

  _stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // -- Reconnection -------------------------------------------------------

  _scheduleReconnect() {
    clearTimeout(this.reconnectTimeout);
    // Exponential backoff: 1.5s → 3s → 6s → 12s → cap at 15s.
    // Prevents rapid reconnect loops when the proxy keeps dropping.
    const delay = Math.min(1_500 * 2 ** (this._reconnectAttempts || 0), 15_000);
    this._reconnectAttempts = (this._reconnectAttempts || 0) + 1;
    this.reconnectTimeout = setTimeout(() => {
      this.connect({ sessionId: this._sessionId });
    }, delay);
  }
}

const ws = new AgentWS();
export default ws;
