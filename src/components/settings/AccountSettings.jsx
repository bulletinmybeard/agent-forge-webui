import { useCallback, useEffect, useState } from "react";
import { AUTH_EVENT } from "../../lib/auth";
import { useAuth } from "../AuthGate";

function formatWhen(value) {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AccountSettings() {
  const me = useAuth();
  const [keys, setKeys] = useState([]);
  const [keyName, setKeyName] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");

  const loadKeys = useCallback(async () => {
    const response = await fetch("/api/auth/keys");
    if (!response.ok) return;
    setKeys(await response.json());
  }, []);

  useEffect(() => {
    if (!me) return;
    loadKeys();
  }, [me, loadKeys]);

  if (!me) {
    return (
      <>
        <h1 className="settings-page__title">Account</h1>
        <p className="settings-page__hint">
          This deployment has no API keys, so the login wall is off. Chats stay on the admin user.
        </p>
      </>
    );
  }

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.dispatchEvent(new Event(AUTH_EVENT));
  };

  const createKey = async (event) => {
    event.preventDefault();
    setError("");
    setSecret("");
    const response = await fetch("/api/auth/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: keyName }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.detail || "Could not create a key.");
      return;
    }
    setSecret(body.secret || "");
    setKeyName("");
    loadKeys();
  };

  const revoke = async (id) => {
    const response = await fetch(`/api/auth/keys/${id}`, { method: "DELETE" });
    if (response.ok) loadKeys();
  };

  return (
    <>
      <h1 className="settings-page__title">Account</h1>
      <section className="settings-page__section" aria-labelledby="settings-account">
        <h2 id="settings-account" className="settings-page__section-title">
          Signed in
        </h2>
        <p className="settings-page__hint">
          {me.username}
          {me.is_admin ? " (admin)" : ""}
        </p>
        <div className="settings-page__actions">
          <button type="button" className="settings-page__button" onClick={logout}>
            Log out
          </button>
        </div>
      </section>

      <section className="settings-page__section account-block" aria-labelledby="settings-keys">
        <h2 id="settings-keys" className="settings-page__section-title">
          API keys
        </h2>
        <p className="settings-page__hint">
          For a Mac app, a browser extension, or a script. The secret is shown once. A key stays on
          this user.
        </p>
        <form onSubmit={createKey}>
          <label className="settings-page__field">
            <span>Name</span>
            <input value={keyName} onChange={(event) => setKeyName(event.target.value)} required />
          </label>
          <button type="submit" className="settings-page__button">
            Create key
          </button>
        </form>
        {secret ? (
          <p className="account-secret">
            Copy this key now. It will not be shown again.
            <code>{secret}</code>
          </p>
        ) : null}
        <ul className="account-list">
          {keys.map((key) => (
            <li key={key.id}>
              <span>
                {key.name} <code>{key.prefix}</code>
                <span className="account-meta">last used {formatWhen(key.last_used_at)}</span>
              </span>
              <button
                type="button"
                className="settings-page__button"
                onClick={() => revoke(key.id)}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      </section>

      {error ? <p className="auth-error">{error}</p> : null}
    </>
  );
}
