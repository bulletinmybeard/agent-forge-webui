/**
 * Markdown helpers for chat results.
 *
 * 1. LLM answers often quote HTML-like sequences (e.g. Python
 *    ``r"<think>...</think>"``). remark treats those as raw HTML and
 *    react-markdown drops them → ``r"\s*"``. Escape tags outside code.
 * 2. Models nest fences poorly (outer bare ``` + inner ```python as text).
 *    Normalize common cases so highlighting gets a clean language fence.
 */

const HTML_TAG_RE = /<\/?[A-Za-z][A-Za-z0-9:_-]*(?:\s[^>]*)?>/g;

const escapeHtmlTags = (text) =>
  text.replace(HTML_TAG_RE, (tag) => tag.replace(/</g, "&lt;").replace(/>/g, "&gt;"));

/**
 * Line-based fence parser: open fence on its own line → body until matching close.
 * Returns segments: { type: 'text'|'fence', value, lang? }.
 */
function splitFences(src) {
  const lines = src.split("\n");
  const segments = [];
  let i = 0;
  let textBuf = [];

  const flushText = () => {
    if (textBuf.length) {
      segments.push({ type: "text", value: textBuf.join("\n") });
      textBuf = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const open = line.match(/^([ \t]*)(```|~~~)([^\n]*)$/);
    if (!open) {
      textBuf.push(line);
      i++;
      continue;
    }
    flushText();
    const indent = open[1];
    const ticks = open[2];
    let lang = (open[3] || "").trim().split(/\s+/)[0] || "";
    // Drop accidental leading language-only noise like "python" with backticks inside
    if (lang.startsWith("`")) lang = "";
    const body = [];
    i++;
    while (i < lines.length) {
      const close = lines[i].match(new RegExp(`^[ \\t]*${ticks.replace(/`/g, "\\`")}[ \\t]*$`));
      if (close) {
        i++;
        break;
      }
      // Nested fence marker left as body text by the model — strip if it's a
      // language label line like ```python with nothing else.
      const nestedLang = lines[i].match(/^([ \t]*)(```|~~~)([A-Za-z0-9_+-]+)[ \t]*$/);
      if (nestedLang && !lang) {
        lang = nestedLang[3];
        i++;
        continue;
      }
      body.push(lines[i]);
      i++;
    }
    const fenceBody = body.join("\n");
    const openLine = `${indent}${ticks}${lang}`;
    const closeLine = `${indent}${ticks}`;
    segments.push({
      type: "fence",
      lang,
      value: `${openLine}\n${fenceBody}\n${closeLine}`,
    });
  }
  flushText();
  return segments;
}

/**
 * Escape HTML-like tags outside fenced and inline code; normalize fences.
 */
export function protectHtmlInMarkdown(src) {
  if (!src || typeof src !== "string") return src || "";

  const segments = splitFences(src);
  const out = segments.map((seg) => {
    if (seg.type === "fence") return seg.value;

    // Protect inline code, then escape HTML tags in remaining prose.
    const inlines = [];
    let text = seg.value.replace(/(`+)((?:(?!\1).|\n)*?)\1/g, (m) => {
      const i = inlines.length;
      inlines.push(m);
      return `\u0000INLINE${i}\u0000`;
    });
    text = escapeHtmlTags(text);
    text = text.replace(/\u0000INLINE(\d+)\u0000/g, (_, i) => inlines[Number(i)] || "");
    return text;
  });

  return out.join("\n");
}

// Keep for tests / callers that only want fence split
export { splitFences };
