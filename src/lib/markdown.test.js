/**
 *   node src/lib/markdown.test.js
 */
import { protectHtmlInMarkdown, splitFences } from "./markdown.js";

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

console.log("markdown.test.js: all ok");
