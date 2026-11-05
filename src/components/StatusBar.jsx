import { Link, useLocation } from "react-router-dom";

const fmtTokens = (n) => {
  if (!n || n <= 0) return "~";
  if (n < 1000) return String(n);
  if (n < 100_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
};

export default function StatusBar({
  connected,
  sessionInfo = {},
  sessionTitle,
  contextUsage,
}) {
  const settingsActive = useLocation().pathname.startsWith("/settings");
  const tokenUsage = contextUsage?.token_usage;
  const hasTokenUsage = tokenUsage !== undefined && tokenUsage !== null;
  const totalFmt = hasTokenUsage ? fmtTokens(tokenUsage?.total_tokens) : null;
  const tokenTitle = hasTokenUsage
    ? `Session tokens — prompt: ${(tokenUsage.prompt_tokens || 0).toLocaleString()} · completion: ${(tokenUsage.completion_tokens || 0).toLocaleString()} · total: ${(tokenUsage.total_tokens || 0).toLocaleString()}`
    : null;

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          to="/"
          className="text-sm font-semibold shrink-0 no-underline transition-colors text-gray-200 hover:text-indigo-400"
          title="New chat"
        >
          Chat
        </Link>
        <a
          href="/services"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold shrink-0 no-underline text-gray-400 hover:text-gray-200 transition-colors"
          title="Services — live ops dashboard, opens in new tab"
        >
          Services
        </a>
        {sessionTitle && (
          <span className="text-xs text-gray-400 truncate" title={sessionTitle}>
            {sessionTitle}
          </span>
        )}
        {sessionInfo.tools > 0 && (
          <span className="text-xs text-gray-500 shrink-0">{sessionInfo.tools} tools</span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {totalFmt && (
          <span className="text-xs text-gray-500 tabular-nums cursor-default" title={tokenTitle}>
            <span className="text-gray-600 mr-0.5">⬡</span>
            {totalFmt} tokens
          </span>
        )}
        {sessionInfo.sessionId && (
          <span className="text-xs text-gray-600 font-mono">
            {sessionInfo.sessionId.slice(0, 8)}
          </span>
        )}
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            connected ? "bg-emerald-400" : "bg-red-400"
          }`}
          title={connected ? "Connected" : "Disconnected"}
        />
        <Link
          to="/settings"
          aria-label="Settings"
          title="Settings"
          aria-current={settingsActive ? "page" : undefined}
          className={`inline-flex items-center justify-center w-7 h-7 rounded-md no-underline transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
            settingsActive
              ? "text-indigo-300 bg-indigo-500/15"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="w-4 h-4"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </Link>
      </div>
    </header>
  );
}
