import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ws from "../lib/ws";

const fmtTokens = (n) => {
  if (!n || n <= 0) return "~";
  if (n < 1000) return String(n);
  if (n < 100_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${Math.round(n / 1000)}K`;
};

export default function Sidebar({ collapsed, onToggle }) {
  const [sessions, setSessions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();
  const { sessionId: activeSessionId } = useParams();

  const fetchSessions = useCallback(() => {
    fetch("/api/sessions?limit=100")
      .then((r) => (r.ok ? r.json() : []))
      .then(setSessions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  useEffect(() => {
    const onConnected = () => fetchSessions();
    ws.on("connected", onConnected);
    return () => ws.off("connected", onConnected);
  }, [fetchSessions]);

  const handleNewChat = () => {
    navigate("/");
  };

  const handleSelectSession = (id) => {
    navigate(`/chat/${id}`);
  };

  const handleDeleteStart = (e, id) => {
    e.stopPropagation();
    setDeletingId(id);
  };

  const handleDeleteConfirm = async (e, id) => {
    e.stopPropagation();
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setDeletingId(null);
    fetchSessions();
    if (id === activeSessionId) {
      navigate("/");
    }
  };

  const handleDeleteCancel = (e) => {
    e.stopPropagation();
    setDeletingId(null);
  };

  const handleRenameStart = (e, session) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleRenameSubmit = async (id) => {
    if (editTitle.trim()) {
      await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      fetchSessions();
    }
    setEditingId(null);
  };

  const groups = groupByDate(sessions);
  const anyJobRunning = false;

  if (collapsed) {
    return (
      <div className="w-10 bg-gray-950 border-r border-gray-800 flex flex-col items-center pt-3 gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="text-gray-500 hover:text-gray-200 p-1 transition-colors"
          title="Expand sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={anyJobRunning ? undefined : handleNewChat}
          disabled={anyJobRunning}
          className={`p-1 transition-colors ${
            anyJobRunning ? "text-gray-700 cursor-not-allowed" : "text-gray-500 hover:text-gray-200"
          }`}
          title={anyJobRunning ? "Agent is running — wait for it to finish" : "New chat"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-800">
        <button
          type="button"
          onClick={anyJobRunning ? undefined : handleNewChat}
          disabled={anyJobRunning}
          title={anyJobRunning ? "Agent is running — wait for it to finish" : undefined}
          className={`flex-1 flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
            anyJobRunning
              ? "text-gray-600 bg-gray-800/50 cursor-not-allowed"
              : "text-gray-200 bg-gray-800 hover:bg-gray-700"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="ml-2 text-gray-500 hover:text-gray-300 p-1"
          title="Collapse sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {groups.map(({ label, items }) => (
          <div key={label} className="mb-2">
            <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
              {label}
            </div>
            {items.map((session) => {
              const isRunning = session.has_active_job;
              const isActive = session.id === activeSessionId;
              const isBlocked = anyJobRunning && !isActive;
              return (
                <div
                  key={session.id}
                  onClick={isBlocked ? undefined : () => handleSelectSession(session.id)}
                  title={isBlocked ? "Agent is running in another session" : undefined}
                  className={`group flex items-center px-3 py-1.5 mx-1 rounded text-sm
                  ${isBlocked ? "cursor-not-allowed text-gray-600" : "cursor-pointer"}
                  ${
                    isActive
                      ? "bg-gray-800 text-gray-100"
                      : isBlocked
                        ? ""
                        : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
                  }`}
                >
                  {deletingId === session.id ? (
                    /* Inline delete confirmation */
                    <div className="flex items-center justify-between w-full">
                      <span className="text-red-400 text-xs truncate">Delete?</span>
                      <span className="flex items-center gap-1 ml-1">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteConfirm(e, session.id)}
                          className="p-0.5 text-red-400 hover:text-red-300"
                          title="Confirm delete"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteCancel}
                          className="p-0.5 text-gray-500 hover:text-gray-300"
                          title="Cancel"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </span>
                    </div>
                  ) : editingId === session.id ? (
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleRenameSubmit(session.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameSubmit(session.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-gray-800 border border-gray-600 rounded px-1 py-0.5
                               text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
                    />
                  ) : (
                    <>
                      {isRunning && (
                        <svg
                          className="w-3 h-3 mr-1.5 flex-shrink-0 text-indigo-400 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                          />
                        </svg>
                      )}
                      <span className="flex-1 truncate">{session.title}</span>
                      <span
                        className="group-hover:hidden text-[10px] text-gray-700 tabular-nums shrink-0 ml-1"
                        title={
                          session.total_tokens > 0
                            ? `${session.total_tokens.toLocaleString()} tokens used`
                            : "Token count not available (model didn't report usage)"
                        }
                      >
                        {fmtTokens(session.total_tokens)}
                      </span>
                      {!isBlocked && (
                        <span className="hidden group-hover:flex items-center gap-0.5 ml-1">
                          <button
                            type="button"
                            onClick={(e) => handleRenameStart(e, session)}
                            className="p-0.5 text-gray-500 hover:text-gray-300"
                            title="Rename"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteStart(e, session.id)}
                            className="p-0.5 text-gray-500 hover:text-red-400"
                            title="Delete"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="px-3 py-4 text-sm text-gray-600 text-center">No conversations yet</div>
        )}
      </div>
    </div>
  );
}

const groupByDate = (sessions) => {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    Older: [],
  };

  for (const session of sessions) {
    const created = new Date(session.created_at);
    if (created >= today) {
      groups.Today.push(session);
    } else if (created >= yesterday) {
      groups.Yesterday.push(session);
    } else if (created >= weekAgo) {
      groups["Previous 7 Days"].push(session);
    } else {
      groups.Older.push(session);
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};
