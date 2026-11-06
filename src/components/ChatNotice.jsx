import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { dismissChatNotice, subscribeChatNotice } from "../lib/chatNotice";

export default function ChatNotice() {
  const settings = useLocation().pathname.startsWith("/settings");
  const [notice, setNotice] = useState(null);

  useEffect(() => subscribeChatNotice(setNotice), []);

  useEffect(() => {
    if (!notice) return undefined;
    const ms = Math.max(0, notice.until - Date.now());
    const id = setTimeout(() => dismissChatNotice(), ms);
    return () => clearTimeout(id);
  }, [notice]);

  if (!notice || settings) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-12 z-30 flex justify-center px-4">
      <div
        className="pointer-events-auto flex max-w-xl items-center gap-3 rounded-2xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 shadow-lg"
        role="status"
      >
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="h-4 w-4 shrink-0 fill-none stroke-current text-gray-400"
        >
          <circle cx="10" cy="10" r="7.25" strokeWidth="1.5" />
          <path d="M10 9v5" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="6.25" r="0.8" className="fill-current stroke-none" />
        </svg>
        <p className="m-0">{notice.text}</p>
        <button
          type="button"
          className="shrink-0 border-0 bg-transparent p-0 text-lg leading-none text-gray-400 hover:text-gray-200"
          aria-label="Dismiss"
          onClick={dismissChatNotice}
        >
          ×
        </button>
      </div>
    </div>
  );
}
