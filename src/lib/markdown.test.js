/**
 *   node src/lib/markdown.test.js
 */
import { protectHtmlInMarkdown, splitFences, stripWrappingFence } from "./markdown.js";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assert failed");
};

// Prose: <think> tags must survive as visible text (escaped)
{
  const src = "handles message.thinking vs inline <think> tags with line numbers.";
  const out = protectHtmlInMarkdown(src);
  assert(out.includes("&lt;think&gt;"), `expected escaped think open, got: ${out}`);
  assert(!out.includes("<think>"), "raw <think> must not remain in prose");
}

// Python regex in prose
{
  const src = 'content = re.sub(r"<think>(.*?)</think>\\s*", "", content, flags=re.DOTALL).strip()';
  const out = protectHtmlInMarkdown(src);
  assert(out.includes("&lt;think&gt;"), `prose regex must keep think open: ${out}`);
  assert(out.includes("(.*?)"), `capture group must survive: ${out}`);
}

// Fenced python: leave content untouched
{
  const src = '```python\nre.sub(r"<think>(.*?)</think>\\s*", "", content)\n```';
  const out = protectHtmlInMarkdown(src);
  assert(out.includes("<think>"), `fence must keep raw <think>: ${out}`);
  assert(out.includes("</think>"), `fence must keep raw </think>: ${out}`);
  assert(!out.includes("&lt;think&gt;"), "fence must not HTML-escape");
}

// Nested language line inside bare fence → promote to ```python
{
  const src = ["```", "```python", "x = 1", "```", "```"].join("\n");
  // Model: outer bare fence, first body line is ```python
  // Our parser: open bare, then nestedLang promotes lang and skips that line
  const segs = splitFences(src);
  const fence = segs.find((s) => s.type === "fence");
  assert(fence, "expected a fence segment");
  assert(fence.lang === "python", `expected lang python, got ${fence.lang}`);
  assert(fence.value.includes("x = 1"), "body kept");
  // Body should be just "x = 1", not a second ```python marker line
  const body = fence.value.split("\n").slice(1, -1).join("\n");
  assert(body === "x = 1", `expected body 'x = 1', got ${JSON.stringify(body)}`);
}

// Inline code preserved
{
  const src = 'see `r"<think>...</think>"` for the pattern';
  const out = protectHtmlInMarkdown(src);
  assert(out.includes('`r"<think>...</think>"`'), `inline code preserved: ${out}`);
}

// Bare JSON array (model dumped a one-liner) → ```json with pretty body
{
  const src =
    '[{"hash":"abc","date":"2026-04-01","subject":"fix"},{"hash":"def","date":"2026-04-02","subject":"feat"}]';
  const out = protectHtmlInMarkdown(src);
  assert(out.startsWith("```json\n"), `expected json fence, got: ${out.slice(0, 40)}`);
  assert(out.includes('"hash": "abc"'), `pretty JSON should space after colon: ${out}`);
  assert(out.includes("\n  {\n"), `array items should be indented, got: ${out}`);
  assert(out.trim().endsWith("```"), `fence must close: ${out.slice(-20)}`);
}

// Bare JSON object
{
  const src = '{"ok":true,"n":1}';
  const out = protectHtmlInMarkdown(src);
  assert(out.startsWith("```json\n"), `expected json fence: ${out}`);
  assert(out.includes('"ok": true'), `pretty object: ${out}`);
}

// JSON mixed with prose stays prose (don't wrap the whole answer)
{
  const src = 'Here you go:\n[{"hash":"abc"}]';
  const out = protectHtmlInMarkdown(src);
  assert(!out.startsWith("```json"), `mixed prose must not become a json fence: ${out}`);
  assert(out.includes("Here you go:"), "prose kept");
}

// ```json fence body is pretty-printed; lang kept
{
  const src = '```json\n[{"hash":"abc","n":1}]\n```';
  const out = protectHtmlInMarkdown(src);
  assert(out.startsWith("```json\n"), `lang kept: ${out.slice(0, 20)}`);
  assert(out.includes('"hash": "abc"'), `pretty body: ${out}`);
  const segs = splitFences(src);
  assert(segs[0].body === '[{"hash":"abc","n":1}]', `splitFences body: ${segs[0].body}`);
}

// Invalid JSON left alone
{
  const src = '[{"hash": "abc",}]';
  const out = protectHtmlInMarkdown(src);
  assert(out === src, `invalid JSON must stay as-is: ${out}`);
}

// stripWrappingFence: copy path unwraps json; display path keeps it
{
  const src = '```json\n[{"a":1}]\n```';
  const copy = stripWrappingFence(src);
  assert(copy === '[{"a":1}]', `copy payload: ${copy}`);
  const display = stripWrappingFence(src, { markdownWrapOnly: true });
  assert(display === src, `display must keep json fence: ${display}`);
}

// stripWrappingFence: markdown wrap still unwrapped for GFM
{
  const src = "```markdown\n# Hello\n\n- item\n```";
  const display = stripWrappingFence(src, { markdownWrapOnly: true });
  assert(display === "# Hello\n\n- item", `markdown wrap stripped: ${display}`);
}

{
  const src = "```\n# Hello\n```";
  const display = stripWrappingFence(src, { markdownWrapOnly: true });
  assert(display === "# Hello", `bare wrap stripped: ${display}`);
}

console.log("markdown.test.js: all ok");
