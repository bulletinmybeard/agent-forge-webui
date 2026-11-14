// The composer stores one string. A fence is edited as its own field, so the
// ``` markers are not characters in that field. The bytes around a fence are
// structural: the newline that ends the previous line, and the newline before
// a closer. Display text strips those; writing puts them back.

const LANG_RE = /^[\w+-]*$/;

const lineEnd = (source, from) => {
  const nl = source.indexOf("\n", from);
  return nl === -1 ? source.length : nl;
};

export const parsePrompt = (text) => {
  const source = text || "";
  const blocks = [];
  const n = source.length;
  let proseStart = 0;
  let i = 0;

  while (i < n) {
    const atLine = i === 0 || source[i - 1] === "\n";
    if (atLine && source.startsWith("```", i)) {
      const eol = lineEnd(source, i);
      const lang = source.slice(i + 3, eol);
      if (LANG_RE.test(lang)) {
        blocks.push({
          type: "prose",
          value: source.slice(proseStart, i),
          start: proseStart,
          end: i,
        });
        const openEnd = eol;
        const bodyStart = eol < n ? eol + 1 : eol;
        let k = bodyStart;
        let closedAt = -1;
        while (k <= n) {
          const eol2 = lineEnd(source, k);
          if (source.slice(k, eol2) === "```") {
            closedAt = k;
            break;
          }
          if (eol2 === n) break;
          k = eol2 + 1;
        }
        if (closedAt === -1) {
          blocks.push({
            type: "fence",
            lang,
            body: source.slice(bodyStart),
            closed: false,
            start: i,
            end: n,
            openEnd,
            bodyStart,
            bodyEnd: n,
          });
          proseStart = n;
          i = n;
          continue;
        }
        const closeEnd = closedAt + 3;
        blocks.push({
          type: "fence",
          lang,
          body: source.slice(bodyStart, closedAt),
          closed: true,
          start: i,
          end: closeEnd,
          openEnd,
          bodyStart,
          bodyEnd: closedAt,
        });
        proseStart = closeEnd;
        i = closeEnd;
        continue;
      }
    }
    const eol = lineEnd(source, i);
    i = eol < n ? eol + 1 : n;
  }

  blocks.push({
    type: "prose",
    value: source.slice(proseStart),
    start: proseStart,
    end: n,
  });
  return blocks;
};

const prevIsFence = (blocks, index) => index > 0 && blocks[index - 1].type === "fence";

const nextIsFence = (blocks, index) =>
  index < blocks.length - 1 && blocks[index + 1].type === "fence";

export const proseDisplay = (blocks, index) => {
  const block = blocks[index];
  let value = block.value;
  if (prevIsFence(blocks, index) && value.startsWith("\n")) value = value.slice(1);
  if (nextIsFence(blocks, index) && value.endsWith("\n") && value !== "\n") {
    value = value.slice(0, -1);
  }
  return value;
};

// Inverse of proseDisplay for a user edit. An untouched empty tail after a
// fence is "", while a typed character there has to land on the next line.
export const writeProse = (display, prevFence, nextFence) => {
  if (nextFence && display === "" && !prevFence) return "";
  let raw = (prevFence ? "\n" : "") + display;
  if (!nextFence) return raw;
  // The fence opener is its own line. A newline the user typed is content,
  // so it needs one more newline after it or the opener climbs onto that line.
  if (!raw.endsWith("\n")) raw += "\n";
  else if (display.endsWith("\n") && display !== "\n") raw += "\n";
  return raw;
};

export const fenceDisplay = (block) => {
  if (block.closed && block.body.endsWith("\n")) return block.body.slice(0, -1);
  return block.body;
};

export const detectInsertion = (prev, next, cursor) => {
  if (typeof cursor !== "number") return null;
  const delta = next.length - prev.length;
  if (delta <= 0) return null;
  const start = cursor - delta;
  if (start < 0) return null;
  if (next.slice(0, start) !== prev.slice(0, start)) return null;
  if (next.slice(cursor) !== prev.slice(start)) return null;
  return next.slice(start, cursor);
};

const atLineStart = (display, index) => index === 0 || display[index - 1] === "\n";

const splitAroundTrigger = (display, tickStart, tickEnd) => {
  const before = display.slice(0, tickStart);
  const after = display.slice(tickEnd);
  let prefix = before;
  if (prefix && !prefix.endsWith("\n")) prefix += "\n";
  let suffix = after;
  if (suffix && !suffix.startsWith("\n")) suffix = `\n${suffix}`;
  const fence = "```\n\n```";
  return { display: prefix + fence + suffix, caret: prefix.length + 4 };
};

// ``` at the start of a line, or ``` then Space. Multiline pastes are left
// for the parser so a copied fence is not wrapped a second time.
export const triggerInDisplay = (display, cursor, inserted) => {
  if (typeof cursor !== "number" || inserted == null || inserted.includes("\n")) return null;
  if (cursor >= 4 && display.slice(cursor - 4, cursor) === "``` " && inserted.endsWith(" ")) {
    return splitAroundTrigger(display, cursor - 4, cursor);
  }
  const ticksOnly = inserted === "`" || inserted === "``" || inserted === "```";
  if (
    ticksOnly &&
    cursor >= 3 &&
    display.slice(cursor - 3, cursor) === "```" &&
    atLineStart(display, cursor - 3)
  ) {
    return splitAroundTrigger(display, cursor - 3, cursor);
  }
  return null;
};

const structureChanged = (before, after) => {
  const left = parsePrompt(before);
  const right = parsePrompt(after);
  if (left.length !== right.length) return true;
  return left.some((block, index) => block.type !== right[index].type);
};

export const applyProseInput = (text, index, newDisplay, cursor, prevDisplay) => {
  const blocks = parsePrompt(text);
  const block = blocks[index];
  if (block?.type !== "prose") return null;
  const current = proseDisplay(blocks, index);
  if (newDisplay === current) return null;
  const inserted = detectInsertion(prevDisplay ?? current, newDisplay, cursor);
  const triggered = triggerInDisplay(newDisplay, cursor, inserted);
  const display = triggered ? triggered.display : newDisplay;
  const displayCaret = triggered ? triggered.caret : cursor;
  const prevFence = prevIsFence(blocks, index);
  const raw = writeProse(display, prevFence, nextIsFence(blocks, index));
  const nextText = text.slice(0, block.start) + raw + text.slice(block.end);
  const lead = prevFence && raw.startsWith("\n") ? 1 : 0;
  const caret =
    typeof displayCaret === "number"
      ? block.start + lead + Math.max(0, Math.min(displayCaret, display.length))
      : block.start + lead + display.length;
  return {
    text: nextText,
    cursor: caret,
    structural: Boolean(triggered) || structureChanged(text || "", nextText),
  };
};

export const applyFenceInput = (text, index, newDisplay, cursor) => {
  const blocks = parsePrompt(text);
  const block = blocks[index];
  if (block?.type !== "fence") return null;
  if (newDisplay === fenceDisplay(block)) return null;
  const bareOpener = !block.closed && block.bodyStart === block.openEnd;
  let body = newDisplay;
  if (bareOpener && newDisplay !== "") body = `\n${newDisplay}`;
  else if (block.closed) body = `${newDisplay}\n`;
  const nextText = text.slice(0, block.bodyStart) + body + text.slice(block.bodyEnd);
  const lead = bareOpener && newDisplay !== "" ? 1 : 0;
  const caret =
    typeof cursor === "number"
      ? block.bodyStart + lead + Math.max(0, Math.min(cursor, newDisplay.length))
      : block.bodyStart + lead + newDisplay.length;
  return { text: nextText, cursor: caret, structural: false };
};

export const removeEmptyFence = (text, index) => {
  const blocks = parsePrompt(text);
  const block = blocks[index];
  if (block?.type !== "fence" || fenceDisplay(block) !== "") return null;
  let from = block.start;
  let to = block.end;
  if (from > 0 && text[from - 1] === "\n") from -= 1;
  else if (to < text.length && text[to] === "\n") to += 1;
  return { text: text.slice(0, from) + text.slice(to), cursor: from };
};

export const locateCaret = (blocks, cursor) => {
  const last = blocks.length - 1;
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (block.type !== "prose") continue;
    const prevFence = prevIsFence(blocks, index);
    const lead = prevFence && block.value.startsWith("\n") ? 1 : 0;
    const display = proseDisplay(blocks, index);
    const displayStart = block.start + lead;
    const displayEnd = displayStart + display.length;
    if (cursor >= block.start && cursor < displayStart) return { index, offset: 0 };
    const ownsThrough =
      index === last || blocks[index + 1].type === "fence" ? block.end : displayEnd;
    if (cursor >= displayStart && cursor <= ownsThrough && cursor <= displayEnd) {
      const fence = blocks[index - 1];
      if (display === "" && prevFence && fence.closed === false && cursor === block.start) {
        return { index: index - 1, offset: fenceDisplay(fence).length };
      }
      return { index, offset: cursor - displayStart };
    }
    if (cursor > displayEnd && cursor <= ownsThrough && index === last) {
      return { index, offset: display.length };
    }
  }
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (block.type !== "fence") continue;
    if (cursor >= block.start && cursor < block.bodyStart) return { index, offset: 0 };
    if (cursor >= block.bodyStart && cursor < block.end) {
      const display = fenceDisplay(block);
      const rel = cursor - block.bodyStart;
      return { index, offset: Math.max(0, Math.min(rel, display.length)) };
    }
  }
  const tail = blocks[last];
  const display = tail.type === "prose" ? proseDisplay(blocks, last) : fenceDisplay(tail);
  return { index: last, offset: display.length };
};
