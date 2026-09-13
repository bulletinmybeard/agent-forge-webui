/**
 * Markdown helpers for chat results.
 *
 * 1. LLM answers often quote HTML-like sequences (e.g. Python
 *    ``r"<think>...</think>"``). remark treats those as raw HTML and
 *    react-markdown drops them → ``r"\s*"``. Escape tags outside code.
 * 2. Models nest fences poorly (outer bare ``` + inner ```python as text).
 *    Normalize common cases so highlighting gets a clean language fence.
 * 3. A result that is (or is wrapped as) JSON should stay a ```json fence
 *    so highlight.js can colour it. Bare JSON is fenced; json fence bodies
 *    are pretty-printed when they parse.
 */

const HTML_TAG_RE = /<\/?[A-Za-z][A-Za-z0-9:_-]*(?:\s[^>]*)?>/g;

const JSON_FENCE_LANGS = new Set(["json", "jsonc", "json5"]);
const MARKDOWN_WRAP_LANGS = new Set(["", "markdown", "md", "mdown", "text"]);

const escapeHtmlTags = (text) =>
  text.replace(HTML_TAG_RE, (tag) => tag.replace(/</g, "&lt;").replace(/>/g, "&gt;"));

/**
 * If `text` is a JSON object or array, return a 2-space pretty print.
 * Scalars and invalid JSON return null.
 */
function tryPrettyJson(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  const start = trimmed[0];
  if (start !== "{" && start !== "[") return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed === null || typeof parsed !== "object") return null;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return null;
  }
}

/**
 * Drop a single wrapping fence that is the entire message.
 *
 * Models often wrap a whole markdown answer in ``` / ```markdown.
 * Language-tagged code fences (```json, ```python, …) are kept so the
 * renderer can highlight them. Pass `{ markdownWrapOnly: false }` (default)
 * to strip any single wrapping fence — used for copy/download payloads.
 */
export function stripWrappingFence(text, { markdownWrapOnly = false } = {}) {
  if (!text) return text;
  const stripped = text.trim();
  if (!stripped.startsWith("```") && !stripped.startsWith("~~~")) return text;
  const lines = stripped.split("\n");
  if (lines.length < 2) return text;
  const open = lines[0].match(/^(```|~~~)([^\n]*)$/);
  if (!open) return text;
  const ticks = open[1];
  if (lines[lines.length - 1].trim() !== ticks) return text;
  const lang = (open[2] || "").trim().split(/\s+/)[0].toLowerCase();
  if (markdownWrapOnly && !MARKDOWN_WRAP_LANGS.has(lang)) return text;
  const fenceCount = lines.filter((ln) => ln.trim().startsWith(ticks)).length;
  if (fenceCount !== 2) return text;
  return lines.slice(1, -1).join("\n").trim();
}

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
      indent,
      ticks,
      body: fenceBody,
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
    if (seg.type === "fence") {
      if (JSON_FENCE_LANGS.has((seg.lang || "").toLowerCase())) {
        const pretty = tryPrettyJson(seg.body);
        if (pretty != null) {
          const indent = seg.indent || "";
          const ticks = seg.ticks || "```";
          return `${indent}${ticks}${seg.lang}\n${pretty}\n${indent}${ticks}`;
        }
      }
      return seg.value;
    }

    const prettyJson = tryPrettyJson(seg.value);
    if (prettyJson != null) {
      return `\`\`\`json\n${prettyJson}\n\`\`\``;
    }

    // Escape HTML tags in prose only; leave inline `code` spans as-is.
    const value = seg.value;
    const inlineRe = /(`+)((?:(?!\1).|\n)*?)\1/g;
    let last = 0;
    let text = "";
    for (const m of value.matchAll(inlineRe)) {
      text += escapeHtmlTags(value.slice(last, m.index));
      text += m[0];
      last = m.index + m[0].length;
    }
    text += escapeHtmlTags(value.slice(last));
    return text;
  });

  return out.join("\n");
}

// Keep for tests / callers that only want fence split
export { splitFences };
