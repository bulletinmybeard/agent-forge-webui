import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import {
  applyFenceInput,
  applyProseInput,
  fenceDisplay,
  locateCaret,
  parsePrompt,
  proseDisplay,
  removeEmptyFence,
} from "../lib/promptBlocks";
import PromptHighlight from "./PromptHighlight";

const revealCaret = (el) => {
  const box = el.closest(".prompt-editor");
  if (!box) return;
  const style = getComputedStyle(el);
  const line = Number.parseFloat(style.lineHeight) || 20;
  const pad = Number.parseFloat(style.paddingTop) || 0;
  const lines = el.value.slice(0, el.selectionStart || 0).split("\n").length;
  const elTop = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
  const caretY = elTop + pad + lines * line;
  const top = box.scrollTop;
  const bottom = top + box.clientHeight;
  if (caretY > bottom - 8) box.scrollTop = caretY - box.clientHeight + line + 8;
  else if (caretY - line < top) box.scrollTop = Math.max(0, caretY - line - 8);
};

const onFirstLine = (el) => !el.value.slice(0, el.selectionStart).includes("\n");
const onLastLine = (el) => !el.value.slice(el.selectionStart).includes("\n");

const PromptEditor = forwardRef(function PromptEditor(
  { value, onChange, onKeyDown, onPaste, placeholder, disabled },
  ref,
) {
  const text = value || "";
  const blocks = useMemo(() => parsePrompt(text), [text]);
  const fieldRefs = useRef([]);
  const pending = useRef(null);
  const editId = useRef(0);

  useImperativeHandle(ref, () => ({
    focus() {
      fieldRefs.current.find(Boolean)?.focus();
    },
  }));

  useEffect(() => {
    fieldRefs.current.find(Boolean)?.focus();
  }, []);

  useLayoutEffect(() => {
    for (const el of fieldRefs.current) {
      if (!el) continue;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
    const caret = pending.current;
    if (!caret || caret.id !== editId.current) {
      if (caret) pending.current = null;
      const active = document.activeElement;
      if (active && fieldRefs.current.includes(active)) revealCaret(active);
      return;
    }
    const pos = locateCaret(blocks, caret.cursor);
    const el = fieldRefs.current[pos.index];
    if (!el) return;
    el.focus();
    const offset = Math.max(0, Math.min(pos.offset, el.value.length));
    el.setSelectionRange(offset, offset);
    revealCaret(el);
    const frame = requestAnimationFrame(() => {
      if (pending.current === caret) pending.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [blocks]);

  const commit = (next, cursor, structural) => {
    editId.current += 1;
    if (structural) pending.current = { cursor, id: editId.current };
    onChange(next);
  };

  const hidden = (index) => {
    const block = blocks[index];
    return (
      block.type === "prose" &&
      index > 0 &&
      blocks[index - 1].type === "fence" &&
      !blocks[index - 1].closed &&
      block.value === ""
    );
  };

  const neighbor = (index, step) => {
    for (let i = index + step; i >= 0 && i < blocks.length; i += step) {
      if (!hidden(i)) return i;
    }
    return null;
  };

  const focusBlock = (index, where) => {
    const el = fieldRefs.current[index];
    if (!el) return;
    el.focus();
    const offset = where === "start" ? 0 : el.value.length;
    el.setSelectionRange(offset, offset);
  };

  const moveCaret = (index, e) => {
    const el = e.currentTarget;
    if (e.shiftKey || e.metaKey || e.altKey || e.ctrlKey) return false;
    if (el.selectionStart !== el.selectionEnd) return false;
    const prev = neighbor(index, -1);
    const next = neighbor(index, 1);
    if (e.key === "ArrowUp" && onFirstLine(el) && prev != null) {
      e.preventDefault();
      focusBlock(prev, "end");
      return true;
    }
    if (e.key === "ArrowDown" && onLastLine(el) && next != null) {
      e.preventDefault();
      focusBlock(next, "start");
      return true;
    }
    if (e.key === "ArrowLeft" && el.selectionStart === 0 && prev != null) {
      e.preventDefault();
      focusBlock(prev, "end");
      return true;
    }
    if (e.key === "ArrowRight" && el.selectionStart === el.value.length && next != null) {
      e.preventDefault();
      focusBlock(next, "start");
      return true;
    }
    return false;
  };

  const onProseKeyDown = (index, e) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      onKeyDown?.(e);
      return;
    }
    if (moveCaret(index, e)) return;
    if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !text.includes("\n")) onKeyDown?.(e);
  };

  const onFenceKeyDown = (index, e) => {
    if (e.nativeEvent.isComposing) return;
    const el = e.currentTarget;
    const empty =
      e.key === "Backspace" &&
      !e.shiftKey &&
      !e.metaKey &&
      !e.altKey &&
      !e.ctrlKey &&
      el.selectionStart === 0 &&
      el.selectionEnd === 0 &&
      fenceDisplay(blocks[index]) === "";
    if (empty) {
      e.preventDefault();
      const result = removeEmptyFence(text, index);
      if (!result) return;
      commit(result.text, result.cursor, true);
      return;
    }
    moveCaret(index, e);
  };

  const onProseChange = (index, e) => {
    if (e.nativeEvent.isComposing) return;
    const result = applyProseInput(
      text,
      index,
      e.target.value,
      e.target.selectionStart,
      proseDisplay(blocks, index),
    );
    if (!result) return;
    commit(result.text, result.cursor, result.structural);
  };

  const onFenceChange = (index, e) => {
    if (e.nativeEvent.isComposing) return;
    const result = applyFenceInput(text, index, e.target.value, e.target.selectionStart);
    if (!result) return;
    commit(result.text, result.cursor, false);
  };

  const onCompositionEnd = (index, e, kind) => {
    if (kind === "fence") onFenceChange(index, e);
    else onProseChange(index, e);
  };

  return (
    <div className="prompt-editor">
      {blocks.map((block, index) => {
        if (hidden(index)) return null;
        if (block.type === "fence") {
          const display = fenceDisplay(block);
          return (
            <div key={`fence-${index}`} className="prompt-fence">
              {block.lang ? <div className="prompt-fence-lang">{block.lang}</div> : null}
              <textarea
                ref={(el) => {
                  fieldRefs.current[index] = el;
                }}
                rows={1}
                value={display}
                disabled={disabled}
                spellCheck={false}
                onChange={(e) => onFenceChange(index, e)}
                onKeyDown={(e) => onFenceKeyDown(index, e)}
                onPaste={onPaste}
                onCompositionEnd={(e) => onCompositionEnd(index, e, "fence")}
                className="prompt-fence-input"
                aria-label={block.lang ? `${block.lang} code block` : "code block"}
              />
            </div>
          );
        }
        const display = proseDisplay(blocks, index);
        return (
          <div key={`prose-${index}`} className="relative">
            <div
              aria-hidden
              className="prompt-highlight pointer-events-none absolute inset-0 overflow-hidden px-3 py-2
                         text-sm leading-relaxed whitespace-pre-wrap text-gray-100"
            >
              <PromptHighlight text={display} />
            </div>
            <textarea
              ref={(el) => {
                fieldRefs.current[index] = el;
              }}
              rows={1}
              value={display}
              disabled={disabled}
              placeholder={text === "" ? placeholder : undefined}
              onChange={(e) => onProseChange(index, e)}
              onKeyDown={(e) => onProseKeyDown(index, e)}
              onPaste={onPaste}
              onCompositionEnd={(e) => onCompositionEnd(index, e, "prose")}
              className={`prompt-input relative w-full px-3 py-2 bg-transparent
                          placeholder-gray-500 focus:outline-none
                          disabled:cursor-not-allowed
                          text-sm resize-none overflow-hidden leading-relaxed whitespace-pre-wrap
                          ${display === "" && text !== "" ? "min-h-8" : ""}`}
            />
          </div>
        );
      })}
    </div>
  );
});

export default PromptEditor;
