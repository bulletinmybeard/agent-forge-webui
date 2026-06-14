import { useCallback, useEffect, useState } from "react";

export default function MemorySettings({ open, onClose }) {
  const [tab, setTab] = useState("facts");
  const [facts, setFacts] = useState([]);
  const [factsLoading, setFactsLoading] = useState(false);
  const [exchanges, setExchanges] = useState([]);
  const [exchangesLoading, setExchangesLoading] = useState(false);
  const [nextOffset, setNextOffset] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [schemas, setSchemas] = useState([]);
  const [schemasLoading, setSchemasLoading] = useState(false);
  const [schemaCacheDisabled, setSchemaCacheDisabled] = useState(false);
  const [scanningDb, setScanningDb] = useState(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/memory/stats");
      if (!res.ok) throw new Error(`stats: ${res.status}`);
      setStats(await res.json());
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const loadFacts = useCallback(async () => {
    setFactsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/memory/facts");
      if (!res.ok) throw new Error(`facts: ${res.status}`);
      setFacts(await res.json());
    } catch (err) {
      setError(String(err));
    } finally {
      setFactsLoading(false);
    }
  }, []);

  const loadExchanges = useCallback(async (offset = null) => {
    setExchangesLoading(true);
    setError(null);
    try {
      const url = offset
        ? `/api/memory/exchanges?limit=50&offset=${encodeURIComponent(offset)}`
        : "/api/memory/exchanges?limit=50";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`exchanges: ${res.status}`);
      const data = await res.json();
      if (offset) {
        setExchanges((prev) => [...prev, ...(data.exchanges || [])]);
      } else {
        setExchanges(data.exchanges || []);
      }
      setNextOffset(data.next_offset || null);
    } catch (err) {
      setError(String(err));
    } finally {
      setExchangesLoading(false);
    }
  }, []);

  const loadSchemas = useCallback(async () => {
    setSchemasLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/memory/schemas");
      if (!res.ok) throw new Error(`schemas: ${res.status}`);
      const data = await res.json();
      setSchemas(data.databases || []);
      setSchemaCacheDisabled(Boolean(data.cache_disabled));
    } catch (err) {
      setError(String(err));
    } finally {
      setSchemasLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    void loadStats();
    void loadFacts();
    void loadExchanges();
    void loadSchemas();
  }, [open, loadStats, loadFacts, loadExchanges, loadSchemas]);

  const handleDeleteFact = async (key) => {
    try {
      const res = await fetch(`/api/memory/facts/${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(`delete fact: ${res.status}`);
      }
      setFacts((prev) => prev.filter((f) => f.key !== key));
      void loadStats();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleClearFacts = async () => {
    if (!window.confirm(`Delete all ${facts.length} fact(s)? This can't be undone.`)) return;
    try {
      const res = await fetch("/api/memory/facts", { method: "DELETE" });
      if (!res.ok) throw new Error(`clear facts: ${res.status}`);
      setFacts([]);
      void loadStats();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleDeleteExchange = async (id) => {
    try {
      const res = await fetch(`/api/memory/exchanges/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`delete exchange: ${res.status}`);
      setExchanges((prev) => prev.filter((e) => e.id !== id));
      void loadStats();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleClearExchanges = async () => {
    const count = stats?.conversation_memory?.points_count ?? exchanges.length;
    if (!window.confirm(`Delete all ${count} stored exchange(s)? This can't be undone.`)) return;
    try {
      const res = await fetch("/api/memory/exchanges", { method: "DELETE" });
      if (!res.ok) throw new Error(`clear exchanges: ${res.status}`);
      setExchanges([]);
      setNextOffset(null);
      void loadStats();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleScanSchema = async (database) => {
    setScanningDb(database);
    setError(null);
    try {
      const res = await fetch(`/api/memory/schemas/${encodeURIComponent(database)}/scan`, {
        method: "POST",
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `scan ${database}: ${res.status}`);
      }
      await loadSchemas();
    } catch (err) {
      setError(String(err));
    } finally {
      setScanningDb(null);
    }
  };

  const handleClearSchema = async (database) => {
    try {
      const res = await fetch(`/api/memory/schemas/${encodeURIComponent(database)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`clear schema ${database}: ${res.status}`);
      await loadSchemas();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleClearAllSchemas = async () => {
    const cached = schemas.filter((s) => s.cached).length;
    if (!cached) return;
    if (
      !window.confirm(`Clear all ${cached} cached schema(s)? They'll be re-extracted on next use.`)
    )
      return;
    try {
      const res = await fetch("/api/memory/schemas", { method: "DELETE" });
      if (!res.ok) throw new Error(`clear all schemas: ${res.status}`);
      await loadSchemas();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleToggleCacheDisabled = async () => {
    const target = !schemaCacheDisabled;
    try {
      const res = await fetch("/api/memory/schemas/cache/disabled", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: target }),
      });
      if (!res.ok) throw new Error(`toggle cache: ${res.status}`);
      const data = await res.json();
      setSchemaCacheDisabled(Boolean(data.cache_disabled));
    } catch (err) {
      setError(String(err));
    }
  };

  if (!open) return null;

  const factCount = stats?.facts_count ?? facts.length;
  const exchangeCount = stats?.conversation_memory?.points_count ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-700 p-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Memory</h2>
            <p className="text-xs text-gray-400">
              Stored facts + recalled exchanges. Delete what you don't want the model to remember.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100"
            title="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex gap-2 border-b border-gray-800 px-4 pt-2">
          <TabButton
            active={tab === "facts"}
            onClick={() => setTab("facts")}
            label={`Facts${factCount ? ` (${factCount})` : ""}`}
          />
          <TabButton
            active={tab === "exchanges"}
            onClick={() => setTab("exchanges")}
            label={`Recent Memories${exchangeCount != null ? ` (${exchangeCount})` : ""}`}
          />
          <TabButton
            active={tab === "schemas"}
            onClick={() => setTab("schemas")}
            label={`DB Schemas${schemas.length ? ` (${schemas.filter((s) => s.cached).length}/${schemas.length})` : ""}`}
          />
        </div>

        {error && (
          <div className="border-b border-red-900 bg-red-950/40 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "facts" && (
            <FactsTable
              facts={facts}
              loading={factsLoading}
              onDelete={handleDeleteFact}
              onClear={handleClearFacts}
            />
          )}
          {tab === "exchanges" && (
            <ExchangesTable
              exchanges={exchanges}
              loading={exchangesLoading}
              nextOffset={nextOffset}
              onDelete={handleDeleteExchange}
              onClear={handleClearExchanges}
              onLoadMore={() => void loadExchanges(nextOffset)}
            />
          )}
          {tab === "schemas" && (
            <SchemasTable
              schemas={schemas}
              loading={schemasLoading}
              cacheDisabled={schemaCacheDisabled}
              onToggleCache={handleToggleCacheDisabled}
              onScan={handleScanSchema}
              onClear={handleClearSchema}
              onClearAll={handleClearAllSchemas}
              scanningDb={scanningDb}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const TabButton = ({ active, onClick, label }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-3 py-2 text-sm transition-colors ${
        active
          ? "border-indigo-500 text-gray-100"
          : "border-transparent text-gray-500 hover:text-gray-300"
      }`}
    >
      {label}
    </button>
  );
};

const FactsTable = ({ facts, loading, onDelete, onClear }) => {
  if (loading) return <div className="text-sm text-gray-400">Loading…</div>;
  if (!facts.length) return <div className="text-sm text-gray-500">No facts stored.</div>;

  return (
    <>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={onClear}
          className="rounded border border-red-800 bg-red-900/30 px-3 py-1 text-xs text-red-300 hover:bg-red-900/50"
        >
          Clear all
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-gray-500">
          <tr>
            <th className="p-2">Key</th>
            <th className="p-2">Value</th>
            <th className="p-2">Type</th>
            <th className="p-2">Updated</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody className="text-gray-200">
          {facts.map((f) => (
            <tr key={f.key} className="border-t border-gray-800">
              <td className="p-2 font-mono text-xs text-indigo-300">{f.key}</td>
              <td className="p-2">{f.value}</td>
              <td className="p-2 text-xs text-gray-400">{f.fact_type}</td>
              <td className="p-2 text-xs text-gray-500">
                {f.updated_at ? new Date(f.updated_at).toLocaleString() : "—"}
              </td>
              <td className="p-2 text-right">
                <button
                  type="button"
                  onClick={() => onDelete(f.key)}
                  title="Delete this fact"
                  className="text-gray-500 hover:text-red-400"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

const ExchangesTable = ({ exchanges, loading, nextOffset, onDelete, onClear, onLoadMore }) => {
  if (loading && !exchanges.length) return <div className="text-sm text-gray-400">Loading…</div>;
  if (!exchanges.length) return <div className="text-sm text-gray-500">No stored exchanges.</div>;

  return (
    <>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={onClear}
          className="rounded border border-red-800 bg-red-900/30 px-3 py-1 text-xs text-red-300 hover:bg-red-900/50"
        >
          Clear all
        </button>
      </div>
      <ul className="space-y-3">
        {exchanges.map((e) => (
          <li key={e.id} className="rounded border border-gray-800 bg-gray-950/50 p-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex gap-2 text-xs text-gray-500">
                  {e.mode && <span className="rounded bg-gray-800 px-1.5">{e.mode}</span>}
                  {e.model && <span>{e.model}</span>}
                  {e.timestamp && <span>· {new Date(e.timestamp).toLocaleString()}</span>}
                </div>
                <div className="mb-1 text-sm font-medium text-gray-200">{e.query}</div>
                <div className="text-xs text-gray-400">{e.response_preview}…</div>
              </div>
              <button
                type="button"
                onClick={() => onDelete(e.id)}
                title="Delete this memory"
                className="text-gray-500 hover:text-red-400"
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
      {nextOffset && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className="rounded border border-gray-700 bg-gray-800 px-4 py-1.5 text-sm text-gray-300 hover:border-gray-600 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
};

const SchemasTable = ({
  schemas,
  loading,
  cacheDisabled,
  onToggleCache,
  onScan,
  onClear,
  onClearAll,
  scanningDb,
}) => {
  if (loading && !schemas.length) {
    return <div className="text-sm text-gray-400">Loading…</div>;
  }
  if (!schemas.length) {
    return (
      <div className="text-sm text-gray-500">
        No databases configured. Add entries under <code>sql_databases:</code> in{" "}
        <code>config.yaml</code>.
      </div>
    );
  }

  const cachedCount = schemas.filter((s) => s.cached).length;

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-gray-400 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={cacheDisabled}
            onChange={onToggleCache}
            className="h-3.5 w-3.5 accent-indigo-500"
          />
          Always fetch fresh (bypass cache)
        </label>
        <button
          type="button"
          onClick={onClearAll}
          disabled={!cachedCount}
          className="rounded border border-red-800 bg-red-900/30 px-3 py-1 text-xs text-red-300 hover:bg-red-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Clear all ({cachedCount})
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-gray-500">
          <tr>
            <th className="p-2">Database</th>
            <th className="p-2">Engine</th>
            <th className="p-2">Tables / Columns</th>
            <th className="p-2">Cached</th>
            <th className="p-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="text-gray-200">
          {schemas.map((s) => (
            <tr key={s.database} className="border-t border-gray-800">
              <td className="p-2">
                <div className="font-mono text-xs text-indigo-300">{s.database}</div>
                {s.display_name && s.display_name !== s.database && (
                  <div className="text-xs text-gray-500">{s.display_name}</div>
                )}
              </td>
              <td className="p-2 text-xs text-gray-400">{s.engine || "—"}</td>
              <td className="p-2 text-xs">
                {s.cached ? (
                  <span className="text-gray-300">
                    {s.table_count} / {s.total_columns}
                  </span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>
              <td className="p-2 text-xs text-gray-500">
                {s.cached ? (
                  <span title={s.cached_at}>
                    {s.cached_at ? new Date(s.cached_at).toLocaleString() : "yes"}
                  </span>
                ) : (
                  <span className="text-gray-600">not cached</span>
                )}
              </td>
              <td className="p-2 text-right text-xs whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => onScan(s.database)}
                  disabled={scanningDb === s.database}
                  className="mr-2 rounded border border-indigo-700 bg-indigo-900/30 px-2 py-1 text-indigo-300 hover:bg-indigo-900/50 disabled:opacity-50"
                >
                  {scanningDb === s.database ? "Scanning…" : s.cached ? "Re-scan" : "Scan"}
                </button>
                {s.cached && (
                  <button
                    type="button"
                    onClick={() => onClear(s.database)}
                    title="Clear this cached schema"
                    className="text-gray-500 hover:text-red-400"
                  >
                    ×
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {cacheDisabled && (
        <p className="mt-3 text-xs text-amber-400">
          Cache is disabled — every <code>sql_extract_schema</code> call re-extracts from the
          database. Existing cached entries are kept but ignored.
        </p>
      )}
    </>
  );
};
