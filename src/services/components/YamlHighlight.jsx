const KEY_RE = /^(\s*-?\s*)([A-Za-z_][\w.-]*)(\s*):/;
const STRING_RE = /^(["'])((?:\\.|(?!\1).)*)\1/;
const NUMBER_RE = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/;
const BOOL_RE = /^(?:true|false|null|yes|no|on|off)\b/i;

const tokenizeLine = (line, idx) => {
  const tokens = [];
  let commentStart = -1;
  let inString = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inString) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inString) inString = null;
    } else if (ch === '"' || ch === "'") {
      inString = ch;
    } else if (ch === "#") {
      if (i === 0 || /\s/.test(line[i - 1])) {
        commentStart = i;
        break;
      }
    }
  }
  const code = commentStart >= 0 ? line.slice(0, commentStart) : line;
  const comment = commentStart >= 0 ? line.slice(commentStart) : "";

  const km = code.match(KEY_RE);
  let cursor = 0;
  if (km) {
    const [, leading, key, gap] = km;
    if (leading) tokens.push({ kind: "bullet", value: leading });
    tokens.push({ kind: "key", value: key });
    tokens.push({ kind: "raw", value: `${gap}:` });
    cursor = km[0].length;
  }
  let rest = code.slice(cursor);
  while (rest.length > 0) {
    const lead = rest.match(/^\s+/);
    if (lead) {
      tokens.push({ kind: "raw", value: lead[0] });
      rest = rest.slice(lead[0].length);
      continue;
    }
    const sm = rest.match(STRING_RE);
    if (sm) {
      tokens.push({ kind: "string", value: sm[0] });
      rest = rest.slice(sm[0].length);
      continue;
    }
    const bm = rest.match(BOOL_RE);
    if (bm) {
      tokens.push({ kind: "bool", value: bm[0] });
      rest = rest.slice(bm[0].length);
      continue;
    }
    const nm = rest.match(NUMBER_RE);
    if (nm) {
      tokens.push({ kind: "number", value: nm[0] });
      rest = rest.slice(nm[0].length);
      continue;
    }
    const run = rest.match(/^[^\s#]+/);
    if (run) {
      tokens.push({ kind: "raw", value: run[0] });
      rest = rest.slice(run[0].length);
    } else {
      tokens.push({ kind: "raw", value: rest[0] });
      rest = rest.slice(1);
    }
  }
  if (comment) tokens.push({ kind: "comment", value: comment });

  return tokens.map((t, i) => {
    const cls =
      {
        key: "text-indigo-300",
        string: "text-emerald-300",
        number: "text-amber-300",
        bool: "text-pink-300",
        bullet: "text-gray-400",
        comment: "text-gray-500 italic",
        raw: "text-gray-200",
      }[t.kind] || "";
    return (
      <span key={`${idx}-${i}`} className={cls}>
        {t.value}
      </span>
    );
  });
};

export default function YamlHighlight({ source }) {
  const lines = (source || "").split("\n");
  return (
    <pre className="font-mono text-[12px] leading-relaxed whitespace-pre overflow-auto p-4 bg-gray-950 text-gray-200 rounded-md">
      {lines.map((line, idx) => (
        <div key={idx} className="flex">
          <span className="select-none text-gray-700 pr-3 text-right" style={{ minWidth: "3rem" }}>
            {idx + 1}
          </span>
          <code className="flex-1 whitespace-pre">
            {line.length === 0 ? " " : tokenizeLine(line, idx)}
          </code>
        </div>
      ))}
    </pre>
  );
}
