export default function CompactingMessage() {
  return (
    <div className="flex items-center gap-2 text-sm text-amber-400 py-1">
      <span className="inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      <span>Compacting session history...</span>
    </div>
  );
}
