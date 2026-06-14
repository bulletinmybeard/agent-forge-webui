import { useCallback, useEffect, useRef, useState } from "react";

export default function useServices({ intervalMs = 10000 } = {}) {
  const [services, setServices] = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [dockerAvailable, setDockerAvailable] = useState(true);
  const [dockerError, setDockerError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const timerRef = useRef(null);

  const doFetch = useCallback(async () => {
    try {
      const resp = await fetch("/api/services");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const body = await resp.json();
      setServices(body.services || []);
      setFetchedAt(body.fetched_at || null);
      setDockerAvailable(Boolean(body.docker_available));
      setDockerError(body.docker_error || null);
      setError(null);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void doFetch();
    if (intervalMs > 0) {
      timerRef.current = setInterval(doFetch, intervalMs);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [doFetch, intervalMs]);

  const refresh = useCallback(() => {
    setLoading(true);
    void doFetch();
  }, [doFetch]);

  const fetchLogs = useCallback(async (name, lines = 200) => {
    const resp = await fetch(
      `/api/services/${encodeURIComponent(name)}/logs?lines=${encodeURIComponent(lines)}`,
    );
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error(body.detail || `HTTP ${resp.status}`);
    }
    return resp.json();
  }, []);

  const restartService = useCallback(
    async (name) => {
      const resp = await fetch(`/api/services/${encodeURIComponent(name)}/restart`, {
        method: "POST",
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.detail || `HTTP ${resp.status}`);
      }
      void doFetch();
      return resp.json();
    },
    [doFetch],
  );

  return {
    services,
    fetchedAt,
    dockerAvailable,
    dockerError,
    loading,
    error,
    refresh,
    fetchLogs,
    restartService,
  };
}
