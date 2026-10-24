/**
 *   node src/lib/inlineCode.test.js
 */
import { splitInlineCode } from "./inlineCode.js";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assert failed");
};

const roundTrip = (source) =>
  splitInlineCode(source)
    .map((part) => (part.type === "code" ? `\`${part.value}\`` : part.value))
    .join("");

const codes = (source) =>
  splitInlineCode(source)
    .filter((part) => part.type === "code")
    .map((part) => part.value);

assert(
  codes("Search for an `Sony PS5 DualSense Wireless Controller`")[0] ===
    "Sony PS5 DualSense Wireless Controller",
  "phrase",
);
assert(codes("`starts here` then text")[0] === "starts here", "at start");
assert(codes("see `code`.")[0] === "code", "before punctuation");
assert(codes("(`code`)")[0] === "code", "inside parens");
assert(codes("one `a` and `b`").join(",") === "a,b", "two spans");
assert(codes("still `open").length === 0, "unclosed stays plain");
assert(codes("``").length === 0, "empty pair stays plain");
assert(codes("` `").length === 0, "whitespace pair stays plain");
assert(codes("```code```").length === 0, "fence is not inline");
assert(codes("foo`bar`baz").length === 0, "no boundary, no span");
assert(codes("line `no\nbreak`").length === 0, "newline breaks the span");

for (const sample of [
  "",
  "plain",
  "an `Sony PS5 DualSense Wireless Controller`",
  "```code```",
  "one `a` and `b` end",
]) {
  assert(roundTrip(sample) === sample, `round trip ${sample}`);
}

console.log("inlineCode.test.js ok");
