import { useCallback, useEffect, useState } from "react";
import { announceRailOpen, onOtherRailOpen } from "../lib/rightRail";
import ws from "../lib/ws";

const MIN_CANVAS_WIDTH = 300;
const MAX_CANVAS_WIDTH = 720;
const DEFAULT_CANVAS_WIDTH = 340;
const CANVAS_WIDTH_KEY = "agentforge:canvas-width";
const CANVAS_OPEN_KEY = "agentforge:canvas-open";
const clampWidth = (w) => Math.min(MAX_CANVAS_WIDTH, Math.max(MIN_CANVAS_WIDTH, Math.round(w)));

export const useCanvas = ({ sessionId, enabled }) => {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(() => localStorage.getItem(CANVAS_OPEN_KEY) === "1");
  const [width, setWidthState] = useState(() => {
    const saved = Number.parseInt(localStorage.getItem(CANVAS_WIDTH_KEY) ?? "", 10);
    return Number.isFinite(saved) ? clampWidth(saved) : DEFAULT_CANVAS_WIDTH;
  });
  const setWidth = useCallback((next) => {
    const clamped = clampWidth(next);
    setWidthState(clamped);
    try {
      localStorage.setItem(CANVAS_WIDTH_KEY, String(clamped));
    } catch {}
  }, []);

  const startResize = useCallback(
    (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;
      const onMove = (ev) => setWidth(startWidth - (ev.clientX - startX));
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ew-resize";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [width, setWidth],
  );

  useEffect(() => {
    try {
      localStorage.setItem(CANVAS_OPEN_KEY, isOpen ? "1" : "0");
    } catch {}
    if (isOpen) announceRailOpen("canvas");
  }, [isOpen]);

  useEffect(() => onOtherRailOpen("canvas", () => setIsOpen(false)), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      const el = document.activeElement;
      if (el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.isContentEditable) return;
      setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    fetch(`/api/canvas/${sessionId}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => setItems(Array.isArray(data.items) ? data.items : []))
      .catch(() => {});
  }, [sessionId, enabled]);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const onAdded = (msg) => {
      if (!msg?.item) return;
      setItems((prev) => {
        if (prev.some((it) => it.id === msg.item.id)) return prev;
        return [...prev, msg.item].sort((a, b) => (a.footnote_num ?? 0) - (b.footnote_num ?? 0));
      });
    };

    const onDeleted = (msg) => {
      if (!msg?.item_id) return;
      setItems((prev) => prev.filter((it) => it.id !== msg.item_id));
    };

    ws.on("canvas.item_added", onAdded);
    ws.on("canvas.item_deleted", onDeleted);

    return () => {
      ws.off("canvas.item_added", onAdded);
      ws.off("canvas.item_deleted", onDeleted);
    };
  }, [sessionId, enabled]);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const addNote = useCallback(
    async (text) => {
      if (!sessionId) return;
      try {
        const r = await fetch(`/api/canvas/${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "note", content: text, label: text.slice(0, 60) }),
        });
        if (!r.ok) return;
        const item = await r.json();
        setItems((prev) => {
          if (prev.some((it) => it.id === item.id)) return prev;
          return [...prev, item].sort((a, b) => (a.footnote_num ?? 0) - (b.footnote_num ?? 0));
        });
      } catch {
        // silently fail
      }
    },
    [sessionId],
  );

  const deleteItem = useCallback(
    async (itemId) => {
      if (!sessionId) return;
      try {
        const r = await fetch(`/api/canvas/${sessionId}/${itemId}`, { method: "DELETE" });
        if (!r.ok) return;
        setItems((prev) => prev.filter((it) => it.id !== itemId));
      } catch {}
    },
    [sessionId],
  );

  const addAnchor = useCallback(
    async (anchorId, label) => {
      if (!sessionId) return;
      try {
        const r = await fetch(`/api/canvas/${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "anchor", content: anchorId, label }),
        });
        if (!r.ok) return;
        const item = await r.json();
        setItems((prev) => {
          if (prev.some((it) => it.id === item.id)) return prev;
          return [...prev, item].sort((a, b) => (a.footnote_num ?? 0) - (b.footnote_num ?? 0));
        });
      } catch {}
    },
    [sessionId],
  );

  const updateNote = useCallback(
    async (itemId, content) => {
      if (!sessionId) return;
      try {
        const r = await fetch(`/api/canvas/${sessionId}/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, label: content.slice(0, 60) }),
        });
        if (!r.ok) return;
        const updated = await r.json();
        setItems((prev) => prev.map((it) => (it.id === itemId ? updated : it)));
      } catch {}
    },
    [sessionId],
  );

  if (!enabled) {
    return {
      items: [],
      isOpen: false,
      toggle: () => {},
      open: () => {},
      close: () => {},
      addNote: () => {},
      addAnchor: () => {},
      deleteItem: () => {},
      updateNote: () => {},
      width: DEFAULT_CANVAS_WIDTH,
      setWidth: () => {},
      startResize: () => {},
    };
  }

  return {
    items,
    isOpen,
    toggle,
    open,
    close,
    addNote,
    addAnchor,
    deleteItem,
    updateNote,
    width,
    setWidth,
    startResize,
  };
};
