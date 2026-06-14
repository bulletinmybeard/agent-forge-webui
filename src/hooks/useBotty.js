import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

export const useBotty = () => {
  const { sessionId: urlSessionId } = useParams();

  const [connected, setConnected] = useState(false);
  const [nudges, setNudges] = useState([]);
  const [status, setStatus] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const ws = useRef(null);
  const pingInterval = useRef(null);
  const reconnectTimeout = useRef(null);
  const sessionIdRef = useRef(urlSessionId);

  useEffect(() => {
    sessionIdRef.current = urlSessionId;
  }, [urlSessionId]);

  const getWsUrl = useCallback(() => {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    let url = `${proto}//${location.host}/ws/botty`;
    if (sessionIdRef.current) {
      url += `?session_id=${encodeURIComponent(sessionIdRef.current)}`;
    }
    return url;
  }, []);

  const startPing = useCallback(() => {
    if (pingInterval.current) clearInterval(pingInterval.current);
    pingInterval.current = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }, []);

  const stopPing = useCallback(() => {
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
  }, []);

  const handleMessage = useCallback(
    (msg) => {
      if (msg.type === "botty.nudge") {
        const nudge = {
          nudge_id: msg.nudge_id,
          message: msg.message,
          action_type: msg.action_type,
          related_sessions: msg.related_sessions || [],
          reasoning: msg.reasoning || "",
          timestamp: Date.now(),
        };
        setNudges((prev) => [nudge, ...prev]);
        if (!isExpanded) {
          setUnreadCount((prev) => prev + 1);
        }
      } else if (msg.type === "botty.status") {
        setStatus({
          phase: msg.phase,
          momentum: msg.momentum,
          message_count: msg.message_count,
        });
      } else if (msg.type === "botty.recall") {
        setSearchResults(msg.results || []);
      } else if (msg.type === "botty.quiet") {
        setStatus(null);
      } else if (msg.type === "pong") {
      }
    },
    [isExpanded],
  );

  const connect = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      return;
    }

    if (ws.current) {
      ws.current.onopen = null;
      ws.current.onmessage = null;
      ws.current.onerror = null;
      ws.current.onclose = null;
      if (
        ws.current.readyState === WebSocket.OPEN ||
        ws.current.readyState === WebSocket.CONNECTING
      ) {
        ws.current.close();
      }
      ws.current = null;
    }

    const url = getWsUrl();
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      setConnected(true);
      startPing();
    };

    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleMessage(msg);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.current.onerror = () => {
      setConnected(false);
    };

    ws.current.onclose = () => {
      setConnected(false);
      stopPing();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = setTimeout(connect, 5000);
    };
  }, [getWsUrl, startPing, stopPing, handleMessage]);

  const dismissNudge = useCallback((nudgeId) => {
    setNudges((prev) => prev.filter((n) => n.nudge_id !== nudgeId));
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: "botty.dismiss",
          nudge_id: nudgeId,
        }),
      );
    }
  }, []);

  const markHelpful = useCallback((nudgeId, helpful) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: "botty.helpful",
          nudge_id: nudgeId,
          helpful,
        }),
      );
    }
  }, []);

  const searchSessions = useCallback((query) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: "botty.search",
          query,
        }),
      );
    }
  }, []);

  const askBotty = useCallback((text) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: "botty.query",
          text,
        }),
      );
    }
  }, []);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      stopPing();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws.current) {
        ws.current.onopen = null;
        ws.current.onmessage = null;
        ws.current.onerror = null;
        ws.current.onclose = null;
        ws.current.close();
        ws.current = null;
      }
    };
  }, [connect, stopPing]);

  const setWidgetExpanded = useCallback(
    (expanded) => {
      setIsExpanded(expanded);
      if (expanded) {
        clearUnread();
      }
    },
    [clearUnread],
  );

  return {
    connected,
    nudges,
    status,
    searchResults,
    unreadCount,
    dismissNudge,
    markHelpful,
    searchSessions,
    askBotty,
    clearUnread,
    clearSearch,
    setWidgetExpanded,
  };
};
