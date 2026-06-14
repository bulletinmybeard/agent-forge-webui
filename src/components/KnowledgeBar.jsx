import { useEffect, useState } from "react";

export default function KnowledgeBar() {
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/knowledge")
      .then((r) => {
        if (!r.ok) {
          console.warn("KnowledgeBar: /api/knowledge returned", r.status);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        setData(d);
      })
      .catch((err) => {
        console.warn("KnowledgeBar: fetch failed", err);
        setData(null);
      });
  }, []);

  if (!data || data.source_count === 0) return null;

  const sourceNames = data.sources.map((s) => s.source_name).sort();

  return (
    <div className="border-b border-gray-800 bg-gray-900/60">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-1.5 text-xs
                   text-gray-500 hover:text-gray-400 transition-colors"
      >
        <span>
          <span className="text-gray-400 font-medium">{data.source_count}</span> sources indexed
          {data.document_count > 0 && (
            <>
              {" · "}
              <span className="text-gray-400 font-medium">{data.document_count}</span> documents
            </>
          )}
        </span>
        <span className="text-gray-600">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-2 text-xs text-gray-500 leading-relaxed">
          <div>
            <span className="text-gray-400">Sources:</span>{" "}
            {sourceNames.map((name, i) => (
              <span key={name}>
                {i > 0 && <span className="text-gray-700">, </span>}
                <span className="text-cyan-400/70">{name}</span>
              </span>
            ))}
          </div>
          {data.document_count > 0 && (
            <div className="mt-0.5">
              <span className="text-gray-400">Documents:</span>{" "}
              <span className="text-gray-300">{data.document_count}</span>
              {data.documents && data.documents.length <= 20 && (
                <span className="text-gray-600">
                  {" ("}
                  {data.documents.join(", ")}
                  {")"}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
