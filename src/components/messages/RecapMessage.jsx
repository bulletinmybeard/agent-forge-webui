export default function RecapMessage({ text }) {
  if (!text) return null;

  return (
    <div className="px-3 py-2">
      <div className="border-l-2 border-gray-700/70 pl-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span aria-hidden="true">♦</span>
          <span className="font-medium">Recap</span>
        </div>
        {/* Backend strips Markdown; render as plain text. */}
        <p className="text-xs text-gray-500 italic leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
