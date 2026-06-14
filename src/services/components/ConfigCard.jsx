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

export default function ConfigCard({ config, onClick }) {
  const { name, exists, size, mtime } = config;
  const disabled = !exists;
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        text-left p-3 rounded-md border transition-colors
        bg-gray-900 border-gray-800
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-indigo-500 hover:bg-gray-850"}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-indigo-300 truncate">{name}</span>
        {!exists && (
          <span className="text-[10px] uppercase tracking-wider text-amber-400">missing</span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
        <span>{formatSize(size)}</span>
        <span title={mtime || ""}>{formatMtime(mtime)}</span>
      </div>
    </button>
  );
}
