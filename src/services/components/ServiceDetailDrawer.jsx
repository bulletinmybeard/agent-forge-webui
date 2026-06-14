import { useCallback, useEffect, useRef, useState } from "react";

const LOG_LINE_PRESETS = [100, 200, 500, 1000];
const LIVE_TAIL_MAX_LINES = 2000;

const isSelfRestartBlocked = (service) => {
  const name = (service?.name || service?.service || "").toLowerCase();
  return name.includes("scout-web");
};

export default function ServiceDetailDrawer({ service, onClose, fetchLogs, restartService }) {
  const [logLines, setLogLines] = useState(200);
  const [logText, setLogText] = useState("");
  const [logError, setLogError] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [liveTail, setLiveTail] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [restartError, setRestartError] = useState(null);
  const logRef = useRef(null);
  const esRef = useRef(null);

  const isHostService = service?.type === "host_service";
  const selfBlocked = isSelfRestartBlocked(service);

  const loadLogs = useCallback(async () => {
    if (!service || isHostService) return;
    setLoadingLogs(true);
    setLogError(null);
    try {
      const data = await fetchLogs(service.name, logLines);
      if (data.error) {
        setLogError(data.error);
        setLogText("");
      } else {
        setLogText(data.logs || "");
      }
    } catch (e) {
      setLogError(e.message || String(e));
      setLogText("");
    } finally {
      setLoadingLogs(false);
    }
  }, [service, isHostService, logLines, fetchLogs]);

  useEffect(() => {
    if (!service || isHostService || liveTail) return;
    void loadLogs();
  }, [service, isHostService, liveTail, loadLogs]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (!service || isHostService || !liveTail) {
      return undefined;
    }
    setLogText("");
    setLogError(null);
    const es = new EventSource(
      `/api/services/${encodeURIComponent(service.name)}/logs/stream?tail=50`,
    );
    esRef.current = es;
    es.onmessage = (ev) => {
      setLogText((prev) => {
        const next = prev ? `${prev}\n${ev.data}` : ev.data;
        const nl = next.split("\n");
        if (nl.length > LIVE_TAIL_MAX_LINES) {
          return nl.slice(-LIVE_TAIL_MAX_LINES).join("\n");
        }
        return next;
      });
    };
    es.onerror = () => {
      setLogError("live stream disconnected");
      es.close();
      esRef.current = null;
    };
    return () => {
      es.close();
      if (esRef.current === es) esRef.current = null;
    };
  }, [liveTail, service, isHostService]);

  useEffect(() => {
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, []);

  const onRestart = useCallback(async () => {
    if (!service || isHostService || selfBlocked) return;
    const yes = window.confirm(
      `Restart ${service.name}?\n\nThis will briefly interrupt the service. Other containers keep running.`,
    );
    if (!yes) return;
    setRestarting(true);
    setRestartError(null);
    try {
      await restartService(service.name);
      if (liveTail) {
        setLiveTail(false);
        setTimeout(() => setLiveTail(true), 150);
      } else {
        void loadLogs();
      }
    } catch (e) {
      setRestartError(e.message || String(e));
    } finally {
      setRestarting(false);
    }
  }, [service, isHostService, selfBlocked, restartService, liveTail, loadLogs]);

  if (!service) return null;

  return (
    <aside className="w-[520px] shrink-0 border-l border-gray-800 flex flex-col min-h-0 bg-gray-950">
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-100 truncate">
            {service.service || service.name}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {service.host} · {service.type}
          </div>
        </div>
        {!isHostService && (
          <button
            type="button"
            onClick={onRestart}
            disabled={restarting || selfBlocked}
            className={`text-xs border rounded px-2 py-1 transition-colors
              ${
                selfBlocked
                  ? "border-gray-800 text-gray-600 cursor-not-allowed"
                  : restarting
                    ? "border-amber-800/60 text-amber-300 opacity-70"
                    : "border-amber-700/60 text-amber-300 hover:bg-amber-950/40"
              }
            `}
            title={
              selfBlocked
                ? "Refusing to restart scout-web from the dashboard — use the deploy script"
                : restarting
                  ? "Restart in progress…"
                  : "Restart this container (confirm required)"
            }
          >
            {restarting ? "restarting…" : "restart"}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          title="Close"
          className="text-gray-400 hover:text-gray-200 text-xl leading-none px-2"
        >
          ×
        </button>
      </header>

      {restartError && (
        <div className="bg-red-950/40 text-red-200 text-xs px-4 py-2">
          restart failed: {restartError}
        </div>
      )}

      <div className="px-4 py-3 border-b border-gray-800 text-xs space-y-1.5">
        <Row k="name" v={service.name} />
        {service.id && <Row k="id" v={service.id} mono />}
        <Row k="image" v={service.image || "—"} mono />
        <Row k="state" v={service.state} />
        <Row k="health" v={service.health || "none"} />
        {service.uptime_s != null && (
          <Row
            k="uptime"
            v={
              service.uptime_s >= 60
                ? `${Math.floor(service.uptime_s / 60)} min`
                : `${service.uptime_s}s`
            }
          />
        )}
        {service.ports?.length > 0 && <Row k="ports" v={service.ports.join(", ")} mono />}
        {service.endpoint && <Row k="endpoint" v={service.endpoint} mono />}
        <Row k="status" v={service.status || "—"} />
      </div>

      {isHostService ? (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-500 p-4 text-center">
          Host services (ollama, redis) don't expose container-style logs via this endpoint. Check
          the systemd journal on the remote box directly when needed.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800">
            <span className="text-xs text-gray-500">Logs</span>
            <div
              className={`flex items-center gap-1 ${liveTail ? "opacity-40 pointer-events-none" : ""}`}
            >
              {LOG_LINE_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLogLines(n)}
                  className={`text-xs border rounded px-1.5 py-0.5 transition-colors
                    ${
                      logLines === n
                        ? "border-indigo-500/70 text-indigo-200 bg-indigo-950/30"
                        : "border-gray-700 text-gray-400 hover:text-gray-200"
                    }
                  `}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setLiveTail((v) => !v)}
              className={`ml-auto text-xs border rounded px-2 py-0.5 transition-colors
                ${
                  liveTail
                    ? "border-emerald-700 text-emerald-300 bg-emerald-950/30"
                    : "border-gray-700 text-gray-400 hover:text-gray-200"
                }
              `}
              title={liveTail ? "Stop live tail" : "Start live log stream"}
            >
              {liveTail ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  live
                </span>
              ) : (
                "tail live"
              )}
            </button>
            {!liveTail && (
              <button
                type="button"
                onClick={loadLogs}
                disabled={loadingLogs}
                className="text-xs text-gray-300 hover:text-white border border-gray-700 rounded px-2 py-0.5 disabled:opacity-50"
                title="Re-fetch logs"
              >
                {loadingLogs ? "…" : "refresh"}
              </button>
            )}
          </div>

          <div
            ref={logRef}
            className="flex-1 overflow-auto bg-black/50 font-mono text-[11px] text-gray-300 p-3 whitespace-pre-wrap break-words"
          >
            {logError && <div className="text-red-300 mb-2">log fetch error: {logError}</div>}
            {!logError && !logText && !loadingLogs && (
              <div className="text-gray-600">(no log output)</div>
            )}
            {logText}
          </div>
        </>
      )}
    </aside>
  );
}

const Row = ({ k, v, mono = false }) => {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-500 uppercase tracking-wider w-20 shrink-0 text-[10px] pt-0.5">
        {k}
      </span>
      <span className={`text-gray-200 min-w-0 break-words ${mono ? "font-mono text-[11px]" : ""}`}>
        {v}
      </span>
    </div>
  );
};
