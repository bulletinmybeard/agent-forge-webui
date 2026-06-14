import { memo, useCallback, useState } from "react";

const TOKEN_CLASSES = {
  binary: "text-emerald-300",
  flagLong: "text-violet-400",
  flagShort: "text-violet-300",
  operator: "text-gray-500",
  string: "text-amber-300",
  variable: "text-orange-300",
  other: "text-gray-300",
};

const tokenizeShell = (cmd) => {
  const tokens = [];
  let i = 0;
  let wordCount = 0;

  const push = (text, cls) => tokens.push({ text, cls });

  while (i < cmd.length) {
    if (/\s/.test(cmd[i])) {
      let ws = "";
      while (i < cmd.length && /\s/.test(cmd[i])) ws += cmd[i++];
      push(ws, "");
      continue;
    }

    const twoChar = cmd.slice(i, i + 2);
    if ([">>", "<<", "&&", "||"].includes(twoChar)) {
      push(twoChar, TOKEN_CLASSES.operator);
      i += 2;
      continue;
    }
    if (["|", ">", "<", ";", "&"].includes(cmd[i])) {
      push(cmd[i], TOKEN_CLASSES.operator);
      i++;
      wordCount = 0;
      continue;
    }

    if (cmd[i] === "'") {
      let s = "'";
      i++;
      while (i < cmd.length && cmd[i] !== "'") s += cmd[i++];
      s += cmd[i] || "";
      if (i < cmd.length) i++;
      push(s, TOKEN_CLASSES.string);
      continue;
    }

    if (cmd[i] === '"') {
      let s = '"';
      i++;
      while (i < cmd.length && cmd[i] !== '"') s += cmd[i++];
      s += cmd[i] || "";
      if (i < cmd.length) i++;
      push(s, TOKEN_CLASSES.string);
      continue;
    }

    let word = "";
    while (i < cmd.length && !/[\s|><;&'"\\]/.test(cmd[i])) word += cmd[i++];
    if (!word) {
      push(cmd[i] || "", "");
      i++;
      continue;
    }

    if (wordCount === 0) {
      push(word, TOKEN_CLASSES.binary);
    } else if (word.startsWith("--")) {
      push(word, TOKEN_CLASSES.flagLong);
    } else if (/^-[a-zA-Z]/.test(word)) {
      push(word, TOKEN_CLASSES.flagShort);
    } else if (word.startsWith("$")) {
      push(word, TOKEN_CLASSES.variable);
    } else {
      push(word, TOKEN_CLASSES.other);
    }
    wordCount++;
  }

  return tokens;
};

const ShellCommand = memo(function ShellCommand({ value }) {
  const tokens = tokenizeShell(value);
  return (
    <span>
      {tokens.map((t, idx) =>
        t.cls ? (
          <span key={idx} className={t.cls}>
            {t.text}
          </span>
        ) : (
          <span key={idx}>{t.text}</span>
        ),
      )}
    </span>
  );
});

const ToolArg = ({ argKey, value }) => {
  const isCommand = argKey === "command";
  const display = typeof value === "string" ? value : JSON.stringify(value);

  return (
    <span>
      <span className="text-indigo-400">{argKey}</span>
      <span className="text-gray-600">: </span>
      {isCommand ? (
        <span>
          <span className="text-gray-600">&apos;</span>
          <ShellCommand value={display} />
          <span className="text-gray-600">&apos;</span>
        </span>
      ) : (
        <span className="text-amber-300">&apos;{display}&apos;</span>
      )}
    </span>
  );
};

const GuardBadge = ({ guard }) => {
  if (!guard) {
    return null;
  }

  const verdict = guard.verdict || (guard.destructive ? "destructive" : "safe");
  const source = guard.source || "unknown";
  const autoConfirmed = guard.auto_confirmed;

  if (verdict === "destructive") {
    return (
      <span className="ml-2 inline-flex items-center gap-1 text-xs">
        <span className="text-amber-400">⚠️</span>
        <span className="text-gray-500">{source}</span>
      </span>
    );
  }

  if (verdict === "sudo") {
    if (autoConfirmed) {
      return (
        <span className="ml-2 inline-flex items-center gap-1 text-xs">
          <span
            className="px-1.5 py-0.5 rounded bg-violet-950/60 border border-violet-700/50
                         text-violet-400 inline-flex items-center gap-1"
          >
            <span>🔒</span>
            <span>auto-confirmed</span>
          </span>
        </span>
      );
    }
    return (
      <span className="ml-2 inline-flex items-center gap-1 text-xs">
        <span className="text-violet-400">🔒</span>
        <span className="text-gray-500">sudo</span>
      </span>
    );
  }

  return (
    <span className="ml-2 inline-flex items-center gap-1 text-xs">
      <span className="text-sky-400">✓</span>
      <span className="text-gray-500">{source}</span>
    </span>
  );
};

const AutoSudoPanel = ({ command }) => {
  return (
    <div className="border border-violet-700/50 rounded-lg overflow-hidden">
      <div className="px-3 py-1.5 bg-violet-950/40 border-b border-violet-800/40 text-violet-400 text-xs font-medium flex items-center gap-1.5">
        <span>🔒</span>
        <span>Sudo Auto-Confirmed</span>
      </div>
      <div className="px-3 py-2 flex items-center justify-between gap-4">
        <span className="text-xs text-gray-300 font-mono truncate">$ {command}</span>
        <span
          className="px-2 py-0.5 text-xs font-medium text-violet-400 bg-violet-950/60
                         border border-violet-700/40 rounded shrink-0"
        >
          ✓ Approved
        </span>
      </div>
    </div>
  );
};

const SaveButton = ({ isSaved, onSave, onRemove }) => {
  const [busy, setBusy] = useState(false);

  const handleClick = useCallback(
    async (e) => {
      e.stopPropagation();
      if (busy) return;
      setBusy(true);
      try {
        if (isSaved) {
          await onRemove?.();
        } else {
          await onSave?.();
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, isSaved, onSave, onRemove],
  );

  if (!onSave && !onRemove) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      title={isSaved ? "Remove from cheat sheet" : "Save to cheat sheet"}
      className={`ml-auto flex items-center gap-1 text-xs transition-colors px-1.5 py-0.5 rounded
        ${
          isSaved ? "text-emerald-400 hover:text-red-400" : "text-gray-500 hover:text-sky-300"
        } ${busy ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
    >
      {isSaved ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
      ) : (
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
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
      )}
      <span>{isSaved ? "Saved" : "Save"}</span>
    </button>
  );
};

export default function ToolCallsPanel({ calls, _restored, _live, onSave, onRemove, isSaved }) {
  const [expanded, setExpanded] = useState(!_restored);

  if (!calls || calls.length === 0) {
    return null;
  }

  const autoSudoCalls = calls.filter((c) => c.guard?.auto_confirmed && c.guard.verdict === "sudo");

  const callCount = calls.length;

  return (
    <div className="space-y-2">
      {autoSudoCalls.map((call, i) => (
        <AutoSudoPanel key={`auto-sudo-${i}`} command={call.args?.command || "???"} />
      ))}

      <div className="border border-sky-700/60 rounded-lg overflow-hidden">
        <div
          className="px-3 py-1.5 bg-sky-950/40 border-b border-sky-800/50
                     text-sky-400 text-xs font-medium flex items-center gap-2
                     cursor-pointer select-none hover:bg-sky-950/60 transition-colors"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <span className="text-gray-500 text-[10px] leading-none">{expanded ? "▾" : "▸"}</span>
          <span>Tool Calls</span>
          {_live && (
            <span className="flex items-center gap-1 text-gray-500 font-normal">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              <span>running</span>
            </span>
          )}
          {!expanded && (
            <span className="text-gray-500 font-normal">
              ({callCount} call{callCount !== 1 ? "s" : ""})
            </span>
          )}
          <SaveButton isSaved={!!isSaved} onSave={onSave} onRemove={onRemove} />
        </div>

        {expanded && (
          <div className="px-3 py-2 space-y-1.5 text-xs font-mono">
            {calls.map((call, i) => {
              const argEntries = Object.entries(call.args || {});
              return (
                <div key={i} className="flex items-start flex-wrap gap-x-0">
                  <span className="text-sky-400">{call.name}</span>
                  <span className="text-sky-400">(</span>
                  {argEntries.map(([k, v], ai) => (
                    <span key={k}>
                      <ToolArg argKey={k} value={v} />
                      {ai < argEntries.length - 1 && (
                        <span className="text-gray-600 whitespace-pre">, </span>
                      )}
                    </span>
                  ))}
                  <span className="text-sky-400">)</span>
                  {call.guard && <GuardBadge guard={call.guard} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
