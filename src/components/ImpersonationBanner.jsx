import { useState } from "react";

export default function ImpersonationBanner({ me }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const adminName = me.impersonator?.username || "admin";

  const stop = async () => {
    setPending(true);
    setError("");
    const response = await fetch("/api/auth/impersonate/stop", { method: "POST" });
    if (!response.ok) {
      setPending(false);
      setError("Could not return to the admin session.");
      return;
    }
    window.location.assign("/");
  };

  return (
    <div className="impersonation-banner" role="status">
      <span>Logged in as {me.username}</span>
      <button type="button" onClick={stop} disabled={pending}>
        {pending ? "Returning..." : `Return to ${adminName}`}
      </button>
      {error ? <span className="impersonation-banner__error">{error}</span> : null}
    </div>
  );
}
