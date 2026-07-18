import { useCallback, useEffect, useState } from "react";

export default function useCommandPermissions() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/permissions/commands");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveOverrides = useCallback(
    async (payload) => {
      const res = await fetch("/api/permissions/commands/overrides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refresh();
    },
    [refresh],
  );

  const resetOverrides = useCallback(
    async (tool) => {
      const q = tool ? `?tool=${encodeURIComponent(tool)}` : "";
      const res = await fetch(`/api/permissions/commands/overrides${q}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refresh();
    },
    [refresh],
  );

  const validate = useCallback(async (tool, command, draftPolicy = null) => {
    const body = { tool, command };
    if (draftPolicy) {
      body.policy = draftPolicy;
    }
    const res = await fetch("/api/permissions/commands/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh, saveOverrides, resetOverrides, validate };
}
