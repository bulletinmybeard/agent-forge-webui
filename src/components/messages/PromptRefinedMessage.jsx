export default function PromptRefinedMessage({ message, refined }) {
  const text = refined || "";
  const shown = text.length > 180 ? `${text.slice(0, 177)}...` : text;

  return (
    <div className="px-3 py-2 text-xs">
      <div className="text-gray-500">
        {message || "Refined your prompt for clarity before running."}
      </div>
      {shown && <div className="mt-1 text-gray-300 whitespace-pre-wrap">{shown}</div>}
    </div>
  );
}
