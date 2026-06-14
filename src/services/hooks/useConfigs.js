import { useCallback, useEffect, useState } from "react";

export default function useConfigs() {
  const [configs, setConfigs] = useState([]);
  const [cwd, setCwd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/configs");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const body = await resp.json();
      setConfigs(body.configs || []);
      setCwd(body.cwd || null);
      setError(null);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const fetchOne = useCallback(async (name) => {
    const resp = await fetch(`/api/configs/${encodeURIComponent(name)}`);
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      throw new Error(`HTTP ${resp.status}${detail ? ` — ${detail}` : ""}`);
    }
    return resp.json();
  }, []);

  return { configs, cwd, loading, error, refresh, fetchOne };
}
