import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../AuthGate";

function detailOf(body, fallback) {
  if (typeof body.detail === "string") return body.detail;
  return fallback;
}

function UserForm({ mode, user, onClose, onSaved }) {
  const [username, setUsername] = useState(user?.username || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const editing = mode === "edit";

  const submit = async (event) => {
    event.preventDefault();
    setPending(true);
    setError("");
    const payload = { username };
    if (!editing || password) payload.password = password;
    const response = await fetch(editing ? `/api/users/${user.id}` : "/api/users", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(detailOf(body, editing ? "Could not save the user." : "Could not create the user."));
      return;
    }
    onSaved();
  };

  return createPortal(
    <div className="settings-dialog__backdrop" onClick={onClose}>
      <form
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-user-dialog-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <h2 id="settings-user-dialog-title" className="settings-dialog__title">
          {editing ? "Edit user" : "Create user"}
        </h2>
        <p className="settings-dialog__lead">
          A new user is not an admin. Their chats stay on that user.
        </p>
        <label className="settings-page__field">
          <span>Username</span>
          <input
            value={username}
            autoComplete="off"
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>
        <label className="settings-page__field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            autoComplete="new-password"
            placeholder={editing ? "Leave blank to keep the current password" : ""}
            onChange={(event) => setPassword(event.target.value)}
            required={!editing}
            minLength={password ? 8 : undefined}
          />
        </label>
        {error ? (
          <p className="settings-page__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="settings-dialog__actions">
          <button
            type="button"
            className="settings-page__button"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </button>
          <button type="submit" className="settings-page__button" disabled={pending}>
            {pending ? "Saving..." : editing ? "Save" : "Create user"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function LoginAsUser({ user, onClose }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    setError("");
    const response = await fetch("/api/auth/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPending(false);
      setError(detailOf(body, "Could not log in as that user."));
      return;
    }
    window.location.assign("/");
  };

  return createPortal(
    <div className="settings-dialog__backdrop" onClick={onClose}>
      <div
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-user-login-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="settings-user-login-title" className="settings-dialog__title">
          Log in as {user.username}?
        </h2>
        <p className="settings-dialog__lead">
          You will see AgentForge as that user. A banner at the top returns you to your admin
          session. Log out does not.
        </p>
        {error ? (
          <p className="settings-page__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="settings-dialog__actions">
          <button
            type="button"
            className="settings-page__button"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="settings-page__button"
            onClick={confirm}
            disabled={pending}
          >
            {pending ? "Logging in..." : "Log in"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DeleteUser({ user, onClose, onDeleted }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    setError("");
    const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(detailOf(body, "Could not delete the user."));
      return;
    }
    onDeleted();
  };

  return createPortal(
    <div className="settings-dialog__backdrop" onClick={onClose}>
      <div
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-user-delete-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="settings-user-delete-title" className="settings-dialog__title">
          Delete {user.username}?
        </h2>
        <p className="settings-dialog__lead">
          Their chats, keys, and saved memory go with them. This cannot be undone.
        </p>
        {error ? (
          <p className="settings-page__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="settings-dialog__actions">
          <button
            type="button"
            className="settings-page__button"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="settings-page__danger"
            onClick={confirm}
            disabled={pending}
          >
            {pending ? "Deleting..." : "Delete user"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function UsersSettings() {
  const me = useAuth();
  const [users, setUsers] = useState([]);
  const [editor, setEditor] = useState(null);
  const [pendingLogin, setPendingLogin] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    const response = await fetch("/api/users");
    if (!response.ok) {
      setError("Could not load users.");
      return;
    }
    setError("");
    setUsers(await response.json());
  }, []);

  useEffect(() => {
    if (me?.is_admin) loadUsers();
  }, [me, loadUsers]);

  if (!me?.is_admin) {
    return (
      <>
        <h1 className="settings-page__title">Users</h1>
        <p className="settings-page__hint">Only an admin can manage users.</p>
      </>
    );
  }

  return (
    <>
      <h1 className="settings-page__title">Users</h1>
      <section className="settings-page__section" aria-labelledby="settings-users">
        <h2 id="settings-users" className="settings-page__section-title">
          People
        </h2>
        <p className="settings-page__hint">
          The admin name and password come from the deployment environment. Other users sign in with
          the name and password set here.
        </p>
        <div className="settings-page__actions">
          <button
            type="button"
            className="settings-page__button"
            onClick={() => setEditor({ mode: "create" })}
          >
            Create user
          </button>
        </div>
        <ul className="account-list">
          {users.map((user) => (
            <li key={user.id}>
              <span>
                {user.username}
                {user.is_admin ? " (admin)" : ""}
              </span>
              {user.is_admin ? null : (
                <span className="account-actions">
                  <button
                    type="button"
                    className="settings-page__button"
                    onClick={() => setPendingLogin(user)}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    className="settings-page__button"
                    onClick={() => setEditor({ mode: "edit", user })}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="settings-page__danger"
                    onClick={() => setPendingDelete(user)}
                  >
                    Delete
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
        {error ? (
          <p className="settings-page__error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
      {editor ? (
        <UserForm
          mode={editor.mode}
          user={editor.user}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            loadUsers();
          }}
        />
      ) : null}
      {pendingLogin ? (
        <LoginAsUser user={pendingLogin} onClose={() => setPendingLogin(null)} />
      ) : null}
      {pendingDelete ? (
        <DeleteUser
          user={pendingDelete}
          onClose={() => setPendingDelete(null)}
          onDeleted={() => {
            setPendingDelete(null);
            loadUsers();
          }}
        />
      ) : null}
    </>
  );
}
