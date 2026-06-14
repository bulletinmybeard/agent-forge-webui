import useConnectors from "../hooks/useConnectors";
import ConnectionCard from "./ConnectionCard";
import ConnectorTypeCard from "./ConnectorTypeCard";

export default function ConnectorsContent() {
  const {
    connections,
    types,
    loading,
    refresh,
    startOAuth,
    connectWithToken,
    testConnection,
    deleteConnection,
    updateLabel,
    updateReadWrite,
  } = useConnectors();

  if (loading) {
    return <p className="text-gray-500 text-sm text-center py-8">Loading connectors...</p>;
  }

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Available Connector Types
          </h2>
          <button
            type="button"
            onClick={refresh}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs rounded transition-colors"
          >
            Refresh
          </button>
        </div>
        {types.length === 0 ? (
          <p className="text-gray-600 text-sm">No connector types registered.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {types.map((type) => (
              <ConnectorTypeCard
                key={type.type}
                type={type}
                onConnect={startOAuth}
                onTokenConnect={connectWithToken}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          Active Connections
          {connections.length > 0 && (
            <span className="ml-2 text-gray-600 font-normal normal-case">
              ({connections.length})
            </span>
          )}
        </h2>
        {connections.length === 0 ? (
          <div className="border border-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-500 text-sm">
              No connections yet. Click "Connect" on a connector type above to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            {connections.map((conn) => (
              <ConnectionCard
                key={conn.id}
                connection={conn}
                onTest={testConnection}
                onDelete={deleteConnection}
                onUpdateLabel={updateLabel}
                onUpdateReadWrite={updateReadWrite}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
