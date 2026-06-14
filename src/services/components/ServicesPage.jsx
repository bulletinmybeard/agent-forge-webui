import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import useConfigs from "../hooks/useConfigs";
import useServices from "../hooks/useServices";
import ConfigCard from "./ConfigCard";
import ConfigViewerModal from "./ConfigViewerModal";
import ServiceCard from "./ServiceCard";
import ServiceDetailDrawer from "./ServiceDetailDrawer";

const isOwnContainer = (service = "") => service.startsWith("agentforge") || service === "qdrant";

const HIDDEN_CONFIGS = new Set(["work_log.yaml"]);

const formatFetchedAt = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString();
  } catch {
    return iso;
  }
};

export default function ServicesPage() {
  useDocumentTitle("Services");
  const {
    services,
    fetchedAt,
    dockerAvailable,
    dockerError,
    loading,
    error,
    refresh,
    fetchLogs,
    restartService,
  } = useServices({ intervalMs: 10000 });

  const [selectedName, setSelectedName] = useState(null);
  const {
    configs,
    cwd,
    loading: configsLoading,
    error: configsError,
    refresh: refreshConfigs,
    fetchOne: fetchOneConfig,
  } = useConfigs();
  const [openConfig, setOpenConfig] = useState(null);

  const [containers, hostServices] = useMemo(() => {
    const cs = [];
    const hs = [];
    for (const s of services) {
      if (s.type === "container") {
        if (isOwnContainer(s.service || s.name)) cs.push(s);
      } else {
        hs.push(s);
      }
    }
    return [cs, hs];
  }, [services]);

  const selected = useMemo(
    () => services.find((s) => s.name === selectedName) || null,
    [services, selectedName],
  );

  const visibleConfigs = useMemo(
    () => configs.filter((c) => !HIDDEN_CONFIGS.has(c.name)),
    [configs],
  );

  return (
    <div className="h-screen w-screen flex bg-gray-950 text-gray-100">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-sm font-semibold text-gray-400 no-underline hover:text-gray-200 transition-colors"
            >
              Chat
            </Link>
            <span className="text-sm font-semibold text-indigo-400">Services</span>
            <span className="text-xs text-gray-600">Live ops dashboard · read-only</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>last fetch · {formatFetchedAt(fetchedAt)}</span>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="border border-gray-700 rounded px-2 py-0.5 text-gray-300 hover:text-white disabled:opacity-50"
              title="Fetch now"
            >
              {loading ? "…" : "refresh"}
            </button>
          </div>
        </header>

        {error && <div className="bg-red-950/40 text-red-200 text-sm px-4 py-2">{error}</div>}
        {!dockerAvailable && dockerError && (
          <div className="bg-amber-950/30 text-amber-200 text-xs px-4 py-2 whitespace-pre-wrap">
            Docker socket unavailable · {dockerError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              Containers ({containers.length})
            </h2>
            {containers.length === 0 ? (
              <div className="text-xs text-gray-500 italic">
                {dockerAvailable ? "No containers found." : "Docker probe disabled."}
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {containers.map((s) => (
                  <ServiceCard
                    key={s.name}
                    service={s}
                    active={s.name === selectedName}
                    onClick={() => setSelectedName(s.name)}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              Host services ({hostServices.length})
            </h2>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {hostServices.map((s) => (
                <ServiceCard
                  key={s.name}
                  service={s}
                  active={s.name === selectedName}
                  onClick={() => setSelectedName(s.name)}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs uppercase tracking-wider text-gray-500">
                Configs ({visibleConfigs.length}){" "}
                <span className="normal-case tracking-normal text-gray-600">
                  · read-only{cwd ? ` · ${cwd}` : ""}
                </span>
              </h2>
              <button
                type="button"
                onClick={refreshConfigs}
                disabled={configsLoading}
                className="text-xs border border-gray-700 rounded px-2 py-0.5 text-gray-300 hover:text-white disabled:opacity-50"
                title="Refresh config metadata"
              >
                {configsLoading ? "…" : "refresh"}
              </button>
            </div>
            {configsError && (
              <div className="bg-red-950/40 text-red-200 text-xs p-2 mb-2 rounded">
                {configsError}
              </div>
            )}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {visibleConfigs.map((c) => (
                <ConfigCard key={c.name} config={c} onClick={() => setOpenConfig(c.name)} />
              ))}
            </div>
          </section>
        </div>
      </div>

      {selected && (
        <ServiceDetailDrawer
          service={selected}
          onClose={() => setSelectedName(null)}
          fetchLogs={fetchLogs}
          restartService={restartService}
        />
      )}

      {openConfig && (
        <ConfigViewerModal
          name={openConfig}
          fetchOne={fetchOneConfig}
          onClose={() => setOpenConfig(null)}
        />
      )}
    </div>
  );
}
