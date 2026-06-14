import { formatElapsed } from "../../lib/formatTime";

export default function SchedulerJobMessage({
  type,
  job_id,
  label,
  cron,
  cron_human,
  command,
  elapsed,
  verdict,
}) {
  if (type === "scheduler.guard_rejected") {
    return (
      <div className="px-3 py-2 bg-red-950/40 border border-red-800/50 rounded-lg text-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-red-400 font-medium">⚠ Command Rejected</span>
          <span className="text-gray-500 text-xs">verdict: {verdict}</span>
        </div>
        <code className="text-red-300/80 text-xs block mt-1">{command}</code>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 bg-rose-950/30 border border-rose-800/40 rounded-lg text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-rose-400 font-medium">⏱ Scheduled</span>
        <span className="text-gray-300">{label}</span>
        {elapsed != null && (
          <span className="text-gray-500 text-xs ml-auto">in {formatElapsed(elapsed)}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs mt-1">
        <div>
          <span className="text-gray-500">Schedule</span>
          <span className="text-gray-400 ml-1.5">{cron_human || cron}</span>
        </div>
        <div>
          <span className="text-gray-500">Cron</span>
          <code className="text-gray-400 ml-1.5">{cron}</code>
        </div>
      </div>
      <code className="text-gray-500 text-xs block mt-1 truncate">{command}</code>
      <div className="text-gray-600 text-xs mt-1">ID: {job_id}</div>
    </div>
  );
}
