import { useCallback, useEffect, useState } from "react";

export default function useCommandPermissions() {
  const [data, setData] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [cmdRes, profRes] = await Promise.all([
        fetch("/api/permissions/commands"),
        fetch("/api/permissions/profiles"),
      ]);
      if (!cmdRes.ok) throw new Error(`HTTP ${cmdRes.status}`);
      setData(await cmdRes.json());
      if (profRes.ok) {
        const body = await profRes.json();
        setProfiles(body.profiles || []);
        setActiveProfileId(body.active_profile_id || null);
      } else {
        setProfiles([]);
        setActiveProfileId(null);
      }
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

  const applyProfile = useCallback(
    async (profileId) => {
      // Synthetic presets: __yaml__ (config baseline), __blank__ (empty override)
      const id = profileId || "__yaml__";
      const res = await fetch(`/api/permissions/profiles/${encodeURIComponent(id)}/apply`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      await refresh();
    },
    [refresh],
  );

  const saveProfile = useCallback(
    async (profileId, { description = "", fromCurrent = true, shell, ssh } = {}) => {
      const body = {
        description,
        from_current_overrides: fromCurrent,
      };
      if (!fromCurrent) {
        if (shell) body.shell = shell;
        if (ssh) body.ssh = ssh;
      }
      const res = await fetch(`/api/permissions/profiles/${encodeURIComponent(profileId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      await refresh();
    },
    [refresh],
  );

  const deleteProfile = useCallback(
    async (profileId) => {
      const res = await fetch(`/api/permissions/profiles/${encodeURIComponent(profileId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      await refresh();
    },
    [refresh],
  );

  const clearActiveProfile = useCallback(async () => {
    const res = await fetch("/api/permissions/profiles/active", { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    await refresh();
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    data,
    profiles,
    activeProfileId,
    loading,
    error,
    refresh,
    saveOverrides,
    resetOverrides,
    validate,
    applyProfile,
    saveProfile,
    deleteProfile,
    clearActiveProfile,
  };
}
