import { useCallback, useEffect, useMemo, useState } from "react";

// Subsequence match: every char of `q` appears in order in `text` (case-insensitive).
const fuzzyMatch = (q, text) => {
  if (!q) return true;
  const t = text.toLowerCase();
  let i = 0;
  for (const ch of q.toLowerCase()) {
    if (ch === " ") continue;
    i = t.indexOf(ch, i);
    if (i === -1) return false;
    i++;
  }
  return true;
};

const searchableText = (note) => {
  if (note.kind === "answer") return `${note.title} ${note.content || ""}`;
  const cmds = (note.commands || []).map((c) => c.name).join(" ");
  return `${note.title} ${cmds}`;
};

const BookmarkCard = ({ note, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isAnswer = note.kind === "answer";

  const formattedDate = new Date(note.created_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const commandsText = (note.commands || [])
    .map((c) => {
      const argStr = Object.entries(c.args || {})
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(", ");
      return `${c.name}(${argStr})`;
    })
    .join("\n");

  const copyText = isAnswer ? note.content || "" : commandsText;
  const callCount = (note.commands || []).length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = copyText;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDelete = async () => {
    if (!deleting) {
      setDeleting(true);
      return;
    }
    await onDelete(note.id);
  };

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
      <div
        className="px-4 py-3 flex items-start gap-3 cursor-pointer select-none
                   hover:bg-gray-800/50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-gray-500 text-[10px] mt-0.5 leading-none shrink-0">
          {expanded ? "▾" : "▸"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`shrink-0 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                isAnswer ? "bg-emerald-950/60 text-emerald-400" : "bg-sky-950/60 text-sky-400"
              }`}
            >
              {isAnswer ? "Answer" : "Tool calls"}
            </span>
            <p className="text-gray-100 text-sm font-medium truncate">{note.title}</p>
          </div>
          <p className="text-gray-500 text-xs mt-0.5">
            {formattedDate}
            {note.session_id && (
              <span className="ml-2 text-gray-600">· session {note.session_id.slice(0, 8)}</span>
            )}
            {!isAnswer && (
              <span className="ml-2 text-gray-600">
                · {callCount} call{callCount !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors
                       flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-700"
            title={isAnswer ? "Copy answer" : "Copy all commands"}
          >
            {copied ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-emerald-400"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            )}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          {deleting ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded
                           hover:bg-red-950/40 transition-colors"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setDeleting(false)}
                className="text-xs text-gray-500 hover:text-gray-300 px-1 py-1 rounded
                           hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors
                         p-1 rounded hover:bg-gray-700"
              title="Delete bookmark"
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
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-700/60 px-4 py-3 bg-gray-950/40">
          {isAnswer ? (
            <div className="whitespace-pre-wrap text-sm text-gray-300 max-h-72 overflow-y-auto">
              {note.content || ""}
            </div>
          ) : (
            <div className="space-y-1 font-mono text-sm">
              {(note.commands || []).map((cmd, i) => {
                const argStr = Object.entries(cmd.args || {})
                  .map(([k, v]) => `'${k}': ${JSON.stringify(v)}`)
                  .join(", ");
                return (
                  <div key={i} className="text-gray-300">
                    <span className="text-sky-400">{cmd.name}</span>
                    <span className="text-gray-500">(</span>
                    <span className="text-gray-400">{argStr}</span>
                    <span className="text-gray-500">)</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function BookmarksContent() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const fetchNotes = useCallback(() => {
    fetch("/api/commands?limit=500")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setNotes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleDelete = useCallback(async (noteId) => {
    await fetch(`/api/commands/${noteId}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return notes;
    const ql = q.toLowerCase();
    return notes
      .map((note) => {
        const title = (note.title || "").toLowerCase();
        let rank = 3;
        if (title.includes(ql)) rank = 0;
        else if (fuzzyMatch(q, title)) rank = 1;
        else if (fuzzyMatch(q, searchableText(note))) rank = 2;
        return { note, rank };
      })
      .filter((x) => x.rank < 3)
      .sort((a, b) => a.rank - b.rank)
      .map((x) => x.note);
  }, [notes, query]);

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="px-5 pt-4 pb-3 shrink-0 border-b border-gray-800/60">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bookmarks..."
          className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg
                     text-sm text-gray-200 placeholder-gray-600
                     focus:outline-none focus:border-gray-500"
        />
        <p className="text-gray-500 text-xs mt-2">
          {query.trim()
            ? `${filtered.length} of ${notes.length} bookmark${notes.length !== 1 ? "s" : ""}`
            : `${notes.length} bookmark${notes.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {loading ? (
          <div className="text-gray-500 text-sm text-center py-12">Loading...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-800 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-500"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm font-medium">No bookmarks yet</p>
            <p className="text-gray-600 text-xs mt-1">
              Use the bookmark icon on a Tool Calls panel or an answer to save it here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-12">
            No bookmarks match &quot;{query.trim()}&quot;
          </div>
        ) : (
          filtered.map((note) => <BookmarkCard key={note.id} note={note} onDelete={handleDelete} />)
        )}
      </div>
    </div>
  );
}
