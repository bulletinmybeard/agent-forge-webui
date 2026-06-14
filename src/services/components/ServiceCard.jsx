const dotClass = (state, health) => {
  if (state === "running" && health === "healthy") return "bg-emerald-400";
  if (state === "running" && health === "starting") return "bg-sky-400 animate-pulse";
  if (state === "running" && health === "unhealthy") return "bg-amber-400";
  if (state === "running") return "bg-emerald-400";
  if (state === "restarting") return "bg-amber-400 animate-pulse";
  if (state === "paused") return "bg-gray-400";
  if (state === "exited" || state === "down") return "bg-red-500";
  return "bg-gray-600";
};

const formatUptime = (seconds) => {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h < 24) return mm === 0 ? `${h}h` : `${h}h ${mm} min`;
  const d = Math.floor(h / 24);
  const hh = h % 24;
  return hh === 0 ? `${d}d` : `${d}d ${hh}h`;
};

export default function ServiceCard({ service, active, onClick }) {
  const dot = dotClass(service.state, service.health);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-3 rounded border transition-colors
        ${
          active
            ? "border-indigo-500/70 bg-indigo-950/30"
            : "border-gray-800 bg-gray-900/40 hover:border-gray-700 hover:bg-gray-900/70"
        }
      `}
      title={service.status}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <span className="font-medium text-sm text-gray-100 truncate flex-1">
          {service.service || service.name}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-gray-500 shrink-0">
          {service.host}
        </span>
      </div>
      <div className="text-[11px] text-gray-500 truncate" title={service.image}>
        {service.image || "—"}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-gray-400">
        <span className="truncate">
          {service.state}
          {service.health && service.health !== "none" ? ` · ${service.health}` : ""}
        </span>
        <span>{formatUptime(service.uptime_s)}</span>
      </div>
      {service.ports?.length > 0 && (
        <div className="mt-1 text-[10px] text-gray-500 truncate">{service.ports.join(", ")}</div>
      )}
    </button>
  );
}
