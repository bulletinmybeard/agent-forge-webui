import { useCallback, useEffect, useState } from "react";

export default function useConnectors() {
  const [connections, setConnections] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [connsRes, typesRes] = await Promise.all([
        fetch("/api/connectors").then((r) => r.json()),
        fetch("/api/connectors/types").then((r) => r.json()),
      ]);
      setConnections(connsRes.connections || []);
      setTypes(typesRes.types || []);
    } catch (err) {
      console.error("Failed to fetch connectors:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === "connector-auth-complete") {
        void refresh();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [refresh]);

  const startOAuth = useCallback(async (connectorType, products) => {
    const res = await fetch("/api/connectors/auth/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connector_type: connectorType, products: products || [] }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data.auth_url) {
      window.open(data.auth_url, "oauth", "width=600,height=700");
    }
    return data;
  }, []);

  const connectWithToken = useCallback(
    async (connectorType, url, token, label, readWrite = false) => {
      const res = await fetch("/api/connectors/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connector_type: connectorType,
          url,
          token,
          label,
          read_write: readWrite,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      await refresh();
      return res.json();
    },
    [refresh],
  );

  const testConnection = useCallback(async (connectionId) => {
    const res = await fetch(`/api/connectors/${connectionId}/test`, {
      method: "POST",
    });
    return res.json();
  }, []);

  const deleteConnection = useCallback(
    async (connectionId) => {
      await fetch(`/api/connectors/${connectionId}`, { method: "DELETE" });
      void refresh();
    },
    [refresh],
  );

  const updateLabel = useCallback(
    async (connectionId, newLabel) => {
      await fetch(`/api/connectors/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel }),
      });
      void refresh();
    },
    [refresh],
  );

  const updateReadWrite = useCallback(
    async (connectionId, readWrite) => {
      await fetch(`/api/connectors/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read_write: readWrite }),
      });
      void refresh();
    },
    [refresh],
  );

  return {
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
  };
}
