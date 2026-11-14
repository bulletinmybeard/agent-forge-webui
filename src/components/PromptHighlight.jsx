import { splitInlineCode } from "../lib/inlineCode";

export default function PromptHighlight({ text }) {
  const parts = splitInlineCode(text);
  return parts.map((part, index) => {
    if (part.type !== "code") return <span key={index}>{part.value}</span>;
    return (
      <span
        key={index}
        className="rounded bg-[var(--mail-bg-elevated)] text-[var(--mail-accent-chip)] shadow-[inset_0_0_0_1px_var(--mail-border-strong)] [box-decoration-break:clone]"
      >
        <span className="text-transparent">`</span>
        {part.value}
        <span className="text-transparent">`</span>
      </span>
    );
  });
}
