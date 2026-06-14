import { useCallback, useMemo, useState } from "react";
import CopyButton from "../CopyButton";
import EditButton from "../EditButton";
import InlinePromptEditor from "../InlinePromptEditor";
import RetryButton from "../RetryButton";

const formatTsTime = (ts) => {
  if (!ts) return "";
  const epoch = parseInt(ts.split("-")[0], 10);
  if (!epoch || Number.isNaN(epoch)) return "";
  const d = new Date(epoch);
  const date = d.toLocaleDateString([], { year: "numeric", month: "2-digit", day: "2-digit" });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${time}`;
};

export default function QueryMessage({
  text,
  attachments,
  _ts,
  onPinAnchor,
  isLast = false,
  canRetry = false,
  onRetry,
  onEditSubmit,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const hasAttachments = attachments && attachments.length > 0;
  const imageAttachments = hasAttachments ? attachments.filter((a) => a.is_image && a.url) : [];
  const nonImageAttachments = hasAttachments
    ? attachments.filter((a) => !a.is_image || !a.url)
    : [];

  const anchorId = _ts ? `msg-${_ts}` : undefined;
  const timeStr = useMemo(() => formatTsTime(_ts), [_ts]);

  const handleAnchorClick = useCallback(
    (e) => {
      e.preventDefault();
      if (!anchorId) {
        return;
      }
      const url = new URL(window.location.href);
      url.hash = anchorId;
      window.history.replaceState(null, "", url.toString());
      navigator.clipboard?.writeText(url.toString()).catch(() => {});
      document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [anchorId],
  );

  return (
    <div id={anchorId} className="text-gray-500 text-sm py-1 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div
          className={`flex items-baseline gap-1.5 min-w-0 flex-wrap${isEditing ? " flex-1" : ""}`}
        >
          {timeStr && (
            <span className="text-[10px] text-gray-600 font-mono tabular-nums flex-shrink-0">
              {timeStr}
            </span>
          )}

          {isEditing ? (
            <InlinePromptEditor
              initialText={text}
              onSave={(newText) => {
                setIsEditing(false);
                onEditSubmit?.(newText);
              }}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            text && <span className="break-words">Prompt: &ldquo;{text}&rdquo;</span>
          )}

          {anchorId && (
            <a
              href={`#${anchorId}`}
              onClick={handleAnchorClick}
              title="Copy link to this message"
              className="text-gray-700 hover:text-indigo-400 transition-colors flex-shrink-0
                         text-xs font-mono opacity-0 group-hover:opacity-100
                         hover:opacity-100 focus:opacity-100"
              style={{ opacity: undefined }}
            >
              #
            </a>
          )}

          {onPinAnchor && anchorId && (
            <button
              type="button"
              onClick={() => onPinAnchor(text)}
              title="Pin this message to canvas"
              className="text-gray-700 hover:text-indigo-400 transition-colors flex-shrink-0
                         text-[10px] font-mono opacity-0 group-hover:opacity-100
                         hover:opacity-100 focus:opacity-100 bg-transparent border-0 cursor-pointer
                         px-0"
            >
              pin
            </button>
          )}

          {nonImageAttachments.length > 0 && (
            <span className={text ? "ml-1" : ""}>
              <span className="inline-flex items-center gap-1 flex-wrap">
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
                  className="inline text-gray-600"
                >
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
                {nonImageAttachments.map((a, i) => (
                  <span key={i} className="text-gray-400">
                    {a.name}
                    {i < nonImageAttachments.length - 1 ? "," : ""}
                  </span>
                ))}
              </span>
            </span>
          )}
        </div>

        {text && !isEditing && (
          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
            <CopyButton text={text} />
            {isLast && canRetry && (
              <>
                <EditButton onEdit={() => setIsEditing(true)} />
                <RetryButton onRetry={() => onRetry?.()} />
              </>
            )}
          </div>
        )}
      </div>

      {imageAttachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {imageAttachments.map((a, i) => (
            <div
              key={`img-${i}`}
              className="relative w-12 h-12 rounded border border-gray-700 overflow-hidden
                         bg-gray-800 flex-shrink-0"
            >
              <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
              <div
                className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-gray-300
                           px-0.5 truncate"
              >
                {a.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
