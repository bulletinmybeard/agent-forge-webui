import { useCallback, useState } from "react";

export default function RetryButton({ onRetry, disabled = false, className = "" }) {
  const [busy, setBusy] = useState(false);

  const handleClick = useCallback(async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      await onRetry?.();
    } finally {
      setBusy(false);
    }
  }, [busy, disabled, onRetry]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || disabled}
      title={busy ? "Retrying…" : "Retry prompt"}
      className={`inline-flex items-center gap-1 text-gray-500 hover:text-gray-300
                  transition-colors text-xs bg-transparent border-0 cursor-pointer
                  disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
      Retry
    </button>
  );
}
