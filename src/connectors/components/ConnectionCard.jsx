import { useState } from "react";

const STATUS_COLORS = {
  active: "bg-green-500",
  expired: "bg-amber-500",
  revoked: "bg-red-500",
  error: "bg-red-500",
};

const STATUS_TEXT_COLORS = {
  active: "text-green-400",
  expired: "text-amber-400",
  revoked: "text-red-400",
  error: "text-red-400",
};

export default function ConnectionCard({
  connection,
  onTest,
  onDelete,
  onUpdateLabel,
  onUpdateReadWrite,
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newLabel, setNewLabel] = useState(connection.label);
  const [confirmWrite, setConfirmWrite] = useState(false);
  const [updatingRW, setUpdatingRW] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTest(connection.id);
      setTestResult(result);
      setTimeout(() => setTestResult(null), 5000);
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    await onDelete(connection.id);
  };

  const applyReadWrite = async (rw) => {
    setUpdatingRW(true);
    try {
      await onUpdateReadWrite(connection.id, rw);
    } finally {
      setUpdatingRW(false);
    }
  };

  const handleToggleWrite = (e) => {
    if (e.target.checked) {
      setConfirmWrite(true);
    } else {
      applyReadWrite(false);
    }
  };

  const formatTime = (iso) => {
    if (!iso) return "never";
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60_000) return "just now";
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return `${Math.floor(diff / 86400_000)}d ago`;
  };

  const statusDot = STATUS_COLORS[connection.status] || "bg-gray-500";
  const statusText = STATUS_TEXT_COLORS[connection.status] || "text-gray-400";

  return (
    <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {editing ? (
              <form
                className="flex items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newLabel.trim() && newLabel.trim() !== connection.label) {
                    onUpdateLabel(connection.id, newLabel.trim());
                  }
                  setEditing(false);
                }}
              >
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="px-2 py-0.5 bg-gray-800 border border-indigo-500 rounded text-sm text-gray-200 focus:outline-none w-48"
                  autoFocus
                  onBlur={() => setEditing(false)}
                  onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
                />
              </form>
            ) : (
              <h3
                className="text-gray-200 font-medium text-sm truncate cursor-pointer hover:text-indigo-400 transition-colors"
                onClick={() => setEditing(true)}
                title="Click to rename"
              >
                {connection.label}
              </h3>
            )}
            {connection.account_identifier && (
              <span className="text-gray-500 text-xs truncate">
                ({connection.account_identifier})
              </span>
            )}
          </div>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs">
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
              <span className={statusText}>
                {connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
              </span>
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">Last used: {formatTime(connection.last_used_at)}</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">Type: {connection.connector_type}</span>
          </div>
          {connection.last_error && (
            <p className="mt-1 text-xs text-red-400/80 truncate">{connection.last_error}</p>
          )}
        </div>
      </div>

      {(connection.products?.length || 0) > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1 text-[11px]">
          {connection.products.map((p) => (
            <span
              key={p.label}
              title={p.enabled ? "Granted" : "Not granted"}
              className={
                p.enabled
                  ? "px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300"
                  : "px-1.5 py-0.5 rounded text-gray-600"
              }
            >
              {p.label}
            </span>
          ))}
        </div>
      )}

      {testResult && (
        <div
          className={`mt-2 px-3 py-1.5 rounded text-xs ${
            testResult.ok
              ? "bg-green-950/40 text-green-300 border border-green-800/50"
              : "bg-red-950/40 text-red-300 border border-red-800/50"
          }`}
        >
          {testResult.ok ? `Connected: ${testResult.account}` : `Error: ${testResult.error}`}
        </div>
      )}

      {connection.read_write !== undefined && (
        <div className="mt-3 text-xs">
          {confirmWrite ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-amber-300">
                Grant write access? The agent will be able to modify {connection.label}.
              </span>
              <button
                type="button"
                onClick={() => {
                  setConfirmWrite(false);
                  applyReadWrite(true);
                }}
                disabled={updatingRW}
                className="px-2 py-0.5 rounded bg-amber-700/40 border border-amber-600/50 text-amber-200 hover:bg-amber-700/60 disabled:opacity-50 transition-colors"
              >
                Enable write
              </button>
              <button
                type="button"
                onClick={() => setConfirmWrite(false)}
                className="px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!connection.read_write}
                onChange={handleToggleWrite}
                disabled={updatingRW}
                className="accent-indigo-500"
              />
              <span className={connection.read_write ? "text-amber-400" : ""}>
                Read-write mode (can modify resources)
              </span>
            </label>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs rounded transition-colors disabled:opacity-50"
        >
          {testing ? "Testing..." : "Test"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            confirmDelete
              ? "bg-red-800 hover:bg-red-700 text-red-200 border border-red-600"
              : "bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300"
          }`}
        >
          {confirmDelete ? "Confirm delete" : "Delete"}
        </button>
      </div>
    </div>
  );
}
