import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBotty } from "../hooks/useBotty";
import { announceRailOpen, onOtherRailOpen } from "../lib/rightRail";

export default function BottyWidget() {
  const navigate = useNavigate();

  const botty = useBotty();
  const [state, setState] = useState("dormant");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (botty.unreadCount > 0 && state === "dormant") {
      setState("attention");
    }
  }, [botty.unreadCount, state]);

  useEffect(() => {
    setSearching(false);
  }, []);

  useEffect(() => {
    if (state === "expanded") announceRailOpen("botty");
  }, [state]);

  useEffect(
    () =>
      onOtherRailOpen("botty", () => {
        botty.setWidgetExpanded(false);
        setState("dormant");
      }),
    [botty.setWidgetExpanded],
  );

  const openPreview = () => {
    botty.setWidgetExpanded(true);
    if (botty.nudges.length === 0) {
      setState("expanded");
    } else {
      setState("preview");
    }
  };

  const openExpanded = () => {
    botty.setWidgetExpanded(true);
    setState("expanded");
  };

  const closeWidget = () => {
    botty.setWidgetExpanded(false);
    setState("dormant");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearching(true);
      botty.searchSessions(searchQuery);
    }
  };

  const dismissNudgeAndUpdate = (nudgeId) => {
    botty.dismissNudge(nudgeId);
    if (botty.nudges.length <= 1) {
      setState("dormant");
    }
  };

  const latestNudge = botty.nudges.length > 0 ? botty.nudges[0] : null;

  return (
    <>
      {state === "dormant" && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            type="button"
            onClick={openPreview}
            className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-white shadow-lg transition-all duration-200 flex items-center justify-center"
            aria-label="Open Botty assistant"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </button>
        </div>
      )}

      {state === "attention" && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="absolute inset-0 w-10 h-10 rounded-full animate-pulse bg-indigo-500 opacity-30"></div>

          <button
            type="button"
            onClick={openPreview}
            className="relative w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-white shadow-lg transition-all duration-200 flex items-center justify-center border-2 border-indigo-500"
            aria-label="Open Botty assistant"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>

            {botty.unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {botty.unreadCount > 9 ? "9+" : botty.unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {state === "preview" && latestNudge && (
        <div className="fixed bottom-20 right-6 z-50 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 animate-slide-up">
          <button
            type="button"
            onClick={closeWidget}
            className="absolute top-2 right-2 text-gray-400 hover:text-white transition"
            aria-label="Close preview"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <p className="text-sm text-gray-200 mb-3 pr-6">{latestNudge.message}</p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => dismissNudgeAndUpdate(latestNudge.nudge_id)}
              className="flex-1 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={openExpanded}
              className="flex-1 px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition font-medium"
            >
              Expand
            </button>
          </div>
        </div>
      )}

      {state === "expanded" && (
        <div className="fixed bottom-0 right-0 top-0 z-50 w-80 bg-gray-800 border-l border-gray-700 shadow-2xl flex flex-col animate-slide-left">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <h2 className="text-white font-semibold">Botty</h2>
              {botty.connected && <span className="w-2 h-2 bg-green-400 rounded-full"></span>}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeWidget}
                className="text-gray-400 hover:text-white transition p-1"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {botty.nudges.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <p>No nudges yet.</p>
                <p className="text-xs mt-1">Botty watches your sessions.</p>
              </div>
            ) : (
              botty.nudges.map((nudge) => (
                <div
                  key={nudge.nudge_id}
                  className="bg-gray-700 rounded-lg p-3 space-y-2 hover:bg-gray-650 transition"
                >
                  <p className="text-sm text-gray-200">{nudge.message}</p>

                  {nudge.related_sessions && nudge.related_sessions.length > 0 && (
                    <div className="flex items-center gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const sessionId = nudge.related_sessions[0];
                          navigate(`/chat/${sessionId}`);
                          closeWidget();
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-medium transition"
                      >
                        View session →
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        botty.markHelpful(nudge.nudge_id, true);
                        botty.dismissNudge(nudge.nudge_id);
                      }}
                      className="text-gray-400 hover:text-green-400 transition text-lg"
                      aria-label="Helpful"
                    >
                      👍
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        botty.markHelpful(nudge.nudge_id, false);
                        botty.dismissNudge(nudge.nudge_id);
                      }}
                      className="text-gray-400 hover:text-red-400 transition text-lg"
                      aria-label="Not helpful"
                    >
                      👎
                    </button>
                    <button
                      type="button"
                      onClick={() => botty.dismissNudge(nudge.nudge_id)}
                      className="ml-auto text-gray-400 hover:text-white transition text-xs"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))
            )}

            {searching && botty.searchResults.length === 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-400">Searching...</p>
              </div>
            )}

            {botty.searchResults.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
                <p className="text-xs text-gray-400 font-semibold">Search Results</p>
                {botty.searchResults.map((result) => (
                  <button
                    type="button"
                    key={result.session_id}
                    onClick={() => {
                      navigate(`/chat/${result.session_id}`);
                      setSearchQuery("");
                      botty.clearSearch();
                      closeWidget();
                    }}
                    className="w-full text-left bg-gray-700 hover:bg-gray-600 rounded-lg p-2 text-xs transition"
                  >
                    <p className="text-gray-200 font-medium truncate">{result.query}</p>
                    <p className="text-gray-400 text-xs truncate">{result.preview}</p>
                    {result.score && (
                      <p className="text-gray-500 text-xs mt-1">
                        Match: {Math.round(result.score * 100)}%
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSearch} className="border-t border-gray-700 p-4 space-y-2">
            <input
              type="text"
              placeholder="Search all sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="w-full px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded transition"
            >
              Search
            </button>
          </form>

          {botty.status && (
            <div className="border-t border-gray-700 px-4 py-3 text-xs text-gray-400 space-y-1">
              <p>
                <span className="font-semibold">Phase:</span> {botty.status.phase || "idle"}
              </p>
              <p>
                <span className="font-semibold">Momentum:</span>{" "}
                {botty.status.momentum || "unknown"}
              </p>
              <p>
                <span className="font-semibold">Messages:</span> {botty.status.message_count || 0}
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-left {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }

        .animate-slide-left {
          animation: slide-left 0.3s ease-out;
        }

        .hover:bg-gray-650:hover {
          background-color: rgb(55, 65, 81);
        }
      `}</style>
    </>
  );
}
