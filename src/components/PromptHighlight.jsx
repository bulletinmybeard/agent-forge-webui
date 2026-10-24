import { splitInlineCode } from "../lib/inlineCode";

export default function PromptHighlight({ text }) {
  const parts = splitInlineCode(text);
  return parts.map((part, index) => {
    if (part.type !== "code") return <span key={index}>{part.value}</span>;
    return (
      <span
        key={index}
        className="rounded bg-[#1e293b] text-[#c4b5fd] shadow-[inset_0_0_0_1px_#334155] [box-decoration-break:clone]"
      >
        <span className="text-transparent">`</span>
        {part.value}
        <span className="text-transparent">`</span>
      </span>
    );
  });
}
