// A finished `span` needs a boundary on both ticks: start or a non-word
// character before, end or a non-word character after. The ticks stay in the
// stored prompt so the caret lines up with the highlight.

const INLINE_CODE_RE = /(^|[^\w`])`([^`\n]*\S[^`\n]*)`(?=$|[^\w`])/g;

export const splitInlineCode = (text) => {
  const source = text || "";
  const parts = [];
  let last = 0;
  for (const match of source.matchAll(INLINE_CODE_RE)) {
    const lead = match[1] || "";
    const tickAt = match.index + lead.length;
    if (tickAt > last) parts.push({ type: "text", value: source.slice(last, tickAt) });
    parts.push({ type: "code", value: match[2] });
    last = tickAt + match[2].length + 2;
  }
  if (last < source.length) parts.push({ type: "text", value: source.slice(last) });
  return parts;
};
