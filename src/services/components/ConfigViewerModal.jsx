import { useEffect, useState } from "react";
import YamlHighlight from "./YamlHighlight";

const formatSize = (bytes) => {
  if (bytes === undefined || bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatMtime = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

export default function ConfigViewerModal({ name, fetchOne, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    fetchOne(name)
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name, fetchOne]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleCopy = async () => {
    if (!data?.content) return;
    try {
      await navigator.clipboard.writeText(data.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // best-effort; ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-stretch justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-lg w-full max-w-5xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-indigo-300">{name}</span>
            <span className="text-xs text-gray-500">
              {formatSize(data?.size)} · {formatMtime(data?.mtime)}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-gray-600">read-only</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!data?.content}
              className="text-xs border border-gray-700 rounded px-2 py-0.5 text-gray-300 hover:text-white disabled:opacity-50"
              title="Copy to clipboard"
            >
              {copied ? "copied" : "copy"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs border border-gray-700 rounded px-2 py-0.5 text-gray-300 hover:text-white"
              title="Close (Esc)"
            >
              close
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          {loading && <div className="text-xs text-gray-500 p-4">loading…</div>}
          {error && (
            <div className="bg-red-950/40 text-red-200 text-xs p-4 whitespace-pre-wrap">
              {error}
            </div>
          )}
          {data && !error && <YamlHighlight source={data.content} />}
        </div>
      </div>
    </div>
  );
}
