export default function CompactedMessage({ summary }) {
  return (
    <div className="bg-gray-800/60 border border-amber-500/20 rounded-lg p-4 my-2">
      <div className="flex items-center gap-2 mb-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-amber-400"
        >
          <polyline points="16 16 12 12 8 16" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
        </svg>
        <span className="text-sm font-medium text-amber-400">Session compacted</span>
      </div>
      <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{summary}</div>
    </div>
  );
}
