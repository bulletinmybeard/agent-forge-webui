/**
 *   node src/lib/promptBlocks.test.js
 */
import {
  applyFenceInput,
  applyProseInput,
  fenceDisplay,
  locateCaret,
  parsePrompt,
  proseDisplay,
  removeEmptyFence,
  writeProse,
} from "./promptBlocks.js";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assert failed");
};

const fences = (text) => parsePrompt(text).filter((block) => block.type === "fence");

assert(parsePrompt("").length === 1 && parsePrompt("")[0].type === "prose", "empty is prose");
assert(fences("hello").length === 0, "plain prose");
assert(fences("hello\nworld").length === 0, "multiline prose");
assert(fences("```code```").length === 0, "one-line ticks stay prose");
assert(fences("  ```python\ncode").length === 0, "indented opener stays prose");
assert(fences("``` python\ncode").length === 0, "space after ticks stays prose");

const closed = fences("```\ncode\n```");
assert(closed.length === 1 && closed[0].lang === "" && closed[0].body === "code\n", "closed body");
assert(closed[0].closed === true, "closed flag");
assert(fenceDisplay(closed[0]) === "code", "display drops the closer newline");

const lang = fences("```python\npass\n```");
assert(lang[0].lang === "python" && fenceDisplay(lang[0]) === "pass", "language sticks");

const around = parsePrompt("hello\n```\ncode\n```\nworld");
assert(proseDisplay(around, 0) === "hello", "prose before");
assert(proseDisplay(around, 2) === "world", "prose after");

const emptyBody = fences("```\n```");
assert(emptyBody[0].body === "" && fenceDisplay(emptyBody[0]) === "", "no blank line inside");
const blankBody = fences("```\n\n```");
assert(blankBody[0].body === "\n" && fenceDisplay(blankBody[0]) === "", "blank line inside");

const unclosed = fences("```\ncode");
assert(
  unclosed.length === 1 && unclosed[0].closed === false && unclosed[0].body === "code",
  "unclosed",
);

const adjacent = parsePrompt("```\na\n```\n```\nb\n```");
assert(adjacent.filter((block) => block.type === "fence").length === 2, "two fences");
assert(proseDisplay(adjacent, 2) === "", "nothing between adjacent fences");

for (const sample of ["", "hello", "hello\n", "hello\nworld", "```code```", "  ```\nnope"]) {
  const blocks = parsePrompt(sample);
  assert(blocks.length === 1, `no fence ${JSON.stringify(sample)}`);
  assert(writeProse(proseDisplay(blocks, 0), false, false) === sample, `write back ${sample}`);
}

assert(writeProse(proseDisplay(around, 0), false, true) === "hello\n", "prose before writes back");
assert(writeProse(proseDisplay(around, 2), true, false) === "\nworld", "prose after writes back");

const opened = applyProseInput("", 0, "```", 3, "``");
assert(opened.text === "```\n\n```", `line-start opens a fence: ${opened.text}`);
assert(opened.cursor === 4, "caret on the empty line");
assert(opened.structural === true, "opening a fence moves the caret");
assert(fenceDisplay(fences(opened.text)[0]) === "", "opened fence is empty");

const mid = applyProseInput("see ```", 0, "see ``` ", 8, "see ```");
assert(mid.text === "see \n```\n\n```", `space opens a fence: ${JSON.stringify(mid.text)}`);
assert(locateCaret(parsePrompt(mid.text), mid.cursor).index === 1, "caret is in the fence");

const secondLine = applyProseInput("hello\n``", 0, "hello\n```", 9, "hello\n``");
assert(secondLine.text === "hello\n```\n\n```", `second line: ${secondLine.text}`);

const notYet = applyProseInput("hello", 0, "hello```", 8, "hello``");
assert(notYet.text === "hello```", "mid-line ticks wait for space");
assert(notYet.structural === false, "ordinary ticks do not steal the caret");

const pasted = applyProseInput("", 0, "```\ncode\n```", 12, "");
assert(pasted.text === "```\ncode\n```", "a pasted fence is not wrapped again");
assert(fences(pasted.text)[0].body === "code\n", "paste parses as one fence");
assert(pasted.structural === true, "paste that creates a fence places the caret");

const typed = applyProseInput("hello", 0, "hello!", 6, "hello");
assert(typed.text === "hello!" && typed.structural === false, "a letter stays in prose");

const shifted = applyProseInput("hello\n```\ncode\n```", 0, "hello\n", 6, "hello");
assert(
  shifted.text === "hello\n\n```\ncode\n```",
  `shift-enter before a fence: ${JSON.stringify(shifted.text)}`,
);
assert(proseDisplay(parsePrompt(shifted.text), 0) === "hello\n", "the blank line stays visible");

const lead = applyProseInput("```\n\n```", 0, "z", 1, "");
assert(lead.text === "z\n```\n\n```", `type before a fence: ${JSON.stringify(lead.text)}`);
const trail = applyProseInput("```\n\n```", 2, "z", 1, "");
assert(trail.text === "```\n\n```\nz", `type after a fence: ${JSON.stringify(trail.text)}`);

const kept = applyFenceInput("```\n\n```", 1, "x", 1);
assert(kept.text === "```\nx\n```", `typing in the fence: ${kept.text}`);
assert(applyFenceInput("```\ncode\n```", 1, "code", 4) === null, "same fence text is a no-op");

const removed = removeEmptyFence("hello\n```\n\n```\nrest", 1);
assert(removed.text === "hello\nrest", `backspace joins: ${JSON.stringify(removed.text)}`);
assert(removed.cursor === 5, "caret at the end of the previous line");
assert(removeEmptyFence("```\ncode\n```", 1) === null, "a filled fence stays");
assert(removeEmptyFence("```\n\n```", 1).text === "", "a lone fence clears the prompt");

const after = locateCaret(parsePrompt("```\ncode\n```"), 12);
assert(after.index === 2 && after.offset === 0, "caret after a fence is the trailing prose");
const inside = locateCaret(parsePrompt("```\n\n```"), 4);
assert(inside.index === 1 && inside.offset === 0, "caret on the blank body line");
const openEnd = locateCaret(parsePrompt("```\ncode"), "```\ncode".length);
assert(openEnd.index === 1 && openEnd.offset === 4, "caret at the end of an unclosed fence");

console.log("promptBlocks.test.js ok");
