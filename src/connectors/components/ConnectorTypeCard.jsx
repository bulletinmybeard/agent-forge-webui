import { useState } from "react";

const TYPE_ICONS = {
  google: "G",
  gmail: "M",
  google_drive: "D",
  gitlab: "GL",
  github: "GH",
  bigquery: "BQ",
  youtube: "YT",
};

export default function ConnectorTypeCard({ type, onConnect, onTokenConnect, disabled }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [label, setLabel] = useState("");
  const [readWrite, setReadWrite] = useState(false);

  const isTokenAuth = type.auth_type === "token";
  const needsUrl = type.needs_url !== false; // SaaS-only connectors (e.g. GitHub) hide the URL field
  const hasProducts = (type.products?.length || 0) > 0;

  const [selectedProducts, setSelectedProducts] = useState(() =>
    (type.products || []).map((p) => p.key),
  );

  const toggleProduct = (key) =>
    setSelectedProducts((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const handleOAuthConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      await onConnect(type.type, hasProducts ? selectedProducts : undefined);
    } catch (err) {
      setError(err.message || "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  const handleTokenConnect = async () => {
    const submitUrl = needsUrl ? url.trim() : type.default_url || "";
    if ((needsUrl && !submitUrl) || !token.trim()) {
      setError(needsUrl ? "URL and token are required" : "Token is required");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      await onTokenConnect(type.type, submitUrl, token.trim(), label.trim(), readWrite);
      setShowForm(false);
      setUrl("");
      setToken("");
      setLabel("");
    } catch (err) {
      setError(err.message || "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/50 hover:border-gray-600 transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-md bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center text-indigo-400 font-bold text-sm">
          {TYPE_ICONS[type.type] || type.type[0].toUpperCase()}
        </div>
        <div>
          <h3 className="text-gray-200 font-medium text-sm">{type.display_name}</h3>
          <p className="text-gray-500 text-xs">{type.description}</p>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-400/80">{error}</p>}

      {isTokenAuth && showForm ? (
        <div className="mt-3 space-y-2">
          {needsUrl && (
            <input
              type="text"
              placeholder="URL (e.g., https://gitlab.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
              autoFocus
            />
          )}
          <input
            type="password"
            placeholder="API token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            autoFocus={!needsUrl}
          />
          <input
            type="text"
            placeholder="Label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleTokenConnect()}
          />
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={readWrite}
              onChange={(e) => setReadWrite(e.target.checked)}
              className="accent-indigo-500"
            />
            Read-Write mode (can modify resources)
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTokenConnect}
              disabled={connecting}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded transition-colors"
            >
              {connecting ? "Connecting..." : "Connect"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {hasProducts && (
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {type.products.map((p) => (
                <label
                  key={p.key}
                  className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(p.key)}
                    onChange={() => toggleProduct(p.key)}
                    className="accent-indigo-500"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={isTokenAuth ? () => setShowForm(true) : handleOAuthConnect}
            disabled={connecting || disabled || (hasProducts && selectedProducts.length === 0)}
            className="w-full px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-300 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connecting ? "Connecting..." : "Connect"}
          </button>
        </div>
      )}
    </div>
  );
}
