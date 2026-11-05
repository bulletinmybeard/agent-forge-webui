import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const DELETED = [
  "Chat sessions and messages, including task calls and sessions from other clients",
  "Uploaded attachments for those sessions",
  "Saved facts and remembered instructions",
  "Canvas items",
  "Every point in the Qdrant collection conversation_memory",
];

const KEPT = [
  "Connected services",
  "Saved bookmarks",
  "Command permissions",
  "Scheduled jobs and monitors",
  "Monitor screenshots",
  "Trip maps",
  "Knowledge collections",
];

function countLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function resultText(deleted) {
  const sessions = deleted?.sessions ?? 0;
  const attachments = deleted?.attachments ?? 0;
  const memory = deleted?.conversation_memory;
  let memoryLine = "Conversation memory was not cleared.";
  if (memory === "cleared") memoryLine = "Conversation memory was cleared.";
  if (memory === "unavailable") {
    memoryLine = "Conversation memory was not running, so that store was not cleared.";
  }
  const sessionLabel = countLabel(sessions, "chat session", "chat sessions");
  const attachmentLabel = countLabel(attachments, "attachment folder", "attachment folders");
  return `Deleted ${sessionLabel} and ${attachmentLabel}. ${memoryLine} Connected services were left in place.`;
}

function errorText(data, status) {
  if (!data) return `Delete failed (${status}).`;
  if (typeof data.error === "string") return data.error;
  if (typeof data.detail === "string") return data.detail;
  return `Delete failed (${status}).`;
}

const CONFIRM_PHRASE = "delete";

export default function DataSettings() {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const inputRef = useRef(null);
  const phraseOk = phrase === CONFIRM_PHRASE;

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape" && !pending) {
        setPhrase("");
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending]);

  const close = () => {
    if (pending) return;
    setPhrase("");
    setOpen(false);
  };

  const confirmDelete = async () => {
    if (pending || phrase !== CONFIRM_PHRASE) return;
    const accepted = window.confirm(
      "Delete all chat sessions, attachments, and conversation memory?\n\nConnected services stay. This cannot be undone.",
    );
    if (!accepted) return;
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/user-data/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "delete" }),
      });
      const data = await res.json().catch(() => null);
      if (data?.deleted) setStatus(resultText(data.deleted));
      if (!res.ok) {
        setError(errorText(data, res.status));
        return;
      }
      setOpen(false);
    } catch {
      setError("Could not reach the API.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <h1 className="settings-page__title">Data</h1>
      <section className="settings-page__section" aria-labelledby="settings-delete-all">
        <h2 id="settings-delete-all" className="settings-page__section-title">
          Delete all
        </h2>
        <p className="settings-page__hint">
          Removes chat sessions, attachments, saved memory, and the points in{" "}
          <code>conversation_memory</code>. Connected services stay.
        </p>
        <div className="settings-page__actions">
          <button
            type="button"
            className="settings-page__danger"
            onClick={() => {
              setError("");
              setPhrase("");
              setOpen(true);
            }}
          >
            Delete all
          </button>
        </div>
        {status ? (
          <p className="settings-page__status" role="status">
            {status}
          </p>
        ) : null}
        {error && !open ? (
          <p className="settings-page__error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {open
        ? createPortal(
            <div className="settings-dialog__backdrop" onClick={close}>
              <div
                className="settings-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-delete-dialog-title"
                onClick={(event) => event.stopPropagation()}
              >
                <h2 id="settings-delete-dialog-title" className="settings-dialog__title">
                  Delete all user data?
                </h2>
                <p className="settings-dialog__lead">This cannot be undone.</p>
                <div className="settings-dialog__cols">
                  <div>
                    <h3 className="settings-dialog__label">Deletes</h3>
                    <ul className="settings-dialog__list">
                      {DELETED.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="settings-dialog__label">Stays</h3>
                    <ul className="settings-dialog__list">
                      {KEPT.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <label className="settings-dialog__phrase">
                  <span>
                    Type <code>delete</code> to confirm
                  </span>
                  <input
                    ref={inputRef}
                    value={phrase}
                    onChange={(event) => setPhrase(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        confirmDelete();
                      }
                    }}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label="Type delete to confirm"
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
                    onClick={close}
                    disabled={pending}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="settings-page__danger"
                    onClick={confirmDelete}
                    disabled={!phraseOk || pending}
                  >
                    {pending ? "Deleting..." : "Confirm delete"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
