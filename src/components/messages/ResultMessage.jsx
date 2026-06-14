import { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatElapsed } from "../../lib/formatTime";
import CopyButton from "../CopyButton";

const makeFilename = (text, query) => {
  const toSlug = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const dateStr = (() => {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  })();

  let base = "";

  if (query) {
    const modeMatch = query.match(/^@(\w+)\s*/);
    const mode = modeMatch ? modeMatch[1] : null;
    const cleanQuery = query.replace(/^@\w+\s*/, "").trim();
    const pathMatches = cleanQuery.match(/\/[^\s,'"]+/g) || [];
    const fileNames = [
      ...new Set(
        pathMatches
          .map((p) => p.split("/").pop()) // basename
          .map((f) => f.replace(/\.[^.]+$/, "")) // strip extension
          .filter(Boolean),
      ),
    ].join("-");

    if (fileNames) {
      const prefix = mode && !["agent", "search"].includes(mode) ? mode : "";
      base = [prefix, fileNames].filter(Boolean).join("-");
    } else {
      const words = cleanQuery
        .replace(/[^a-z0-9\s]/gi, " ")
        .split(/\s+/)
        .filter((w) => w.length > 1);
      const prefix = mode || "";
      base = [prefix, ...words.slice(0, 5)].filter(Boolean).join("-");
    }
  }

  if (!base && text) {
    const headingMatch = text.match(/^#{1,3}\s+(.+)/m);
    if (headingMatch) base = headingMatch[1];
  }

  const slug = toSlug(base || "agentforge-result").slice(0, 60);
  return `${slug}-${dateStr}.md`;
};

const DownloadButton = ({ text, query }) => {
  const [saved, setSaved] = useState(false);

  const handleDownload = useCallback(() => {
    if (!text) return;
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = makeFilename(text, query);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [text, query]);

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-300
                 transition-colors text-xs"
      title={saved ? "Saved!" : "Download as Markdown"}
    >
      {saved ? (
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
          className="text-emerald-400"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
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
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )}
      <span>{saved ? "Saved" : "DL"}</span>
    </button>
  );
};

const stripWrappingFence = (text) => {
  if (!text) return text;
  const stripped = text.trim();
  if (!stripped.startsWith("```")) return text;
  const lines = stripped.split("\n");
  if (lines.length < 2) return text;
  if (!lines[lines.length - 1].trim().startsWith("```")) return text;
  const fenceCount = lines.filter((ln) => ln.trim().startsWith("```")).length;
  if (fenceCount !== 2) return text;
  return lines.slice(1, -1).join("\n").trim();
};

const markdownComponents = {
  a: ({ href, children, ...props }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
  img: ({ src, alt, ...props }) => (
    <a href={src} target="_blank" rel="noopener noreferrer" className="inline-block">
      <img src={src} alt={alt || "Screenshot"} className="screenshot-thumb" {...props} />
    </a>
  ),
};

const StreamingCursor = () => {
  return (
    <span
      className="inline-block w-2 h-4 bg-indigo-400 rounded-sm ml-0.5 align-middle"
      style={{
        animation: "cursor-blink 1s steps(2) infinite",
      }}
    />
  );
};

const BookmarkToggle = ({ isSaved, onSave, onRemove }) => {
  const [busy, setBusy] = useState(false);

  const handleClick = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (isSaved) await onRemove?.();
      else await onSave?.();
    } finally {
      setBusy(false);
    }
  }, [busy, isSaved, onSave, onRemove]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      title={isSaved ? "Remove bookmark" : "Bookmark this answer"}
      className={`inline-flex items-center gap-1 text-xs transition-colors ${
        isSaved ? "text-emerald-400 hover:text-red-400" : "text-gray-500 hover:text-sky-300"
      } ${busy ? "opacity-50 cursor-wait" : ""}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill={isSaved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
      </svg>
      <span>{isSaved ? "Saved" : "Save"}</span>
    </button>
  );
};

export default function ResultMessage({
  text,
  elapsed,
  query,
  _streaming,
  isSaved,
  onSave,
  onRemove,
}) {
  const isStreaming = !!_streaming;
  const renderText = isStreaming ? text || "" : stripWrappingFence(text || "");

  return (
    <div className="border border-gray-800 border-l-2 border-l-emerald-500/50 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900/80 border-b border-gray-800">
        <span
          className={`text-xs font-medium ${isStreaming ? "text-indigo-400" : "text-emerald-400"}`}
        >
          {isStreaming ? "● Streaming..." : "✓ Result"}
        </span>
        <div className="flex items-center gap-3">
          {!isStreaming && (onSave || onRemove) && (
            <BookmarkToggle
              isSaved={!!isSaved}
              onSave={() => onSave?.(renderText)}
              onRemove={onRemove}
            />
          )}
          {!isStreaming && <DownloadButton text={renderText} query={query} />}
          {!isStreaming && <CopyButton text={renderText} />}
          {elapsed != null && !isStreaming && (
            <span className="text-gray-500 text-xs">{formatElapsed(elapsed)}</span>
          )}
        </div>
      </div>
      <div className="px-3 py-3 text-sm text-gray-200 markdown-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {renderText}
        </ReactMarkdown>
        {isStreaming && <StreamingCursor />}
      </div>
    </div>
  );
}
