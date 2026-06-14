export default function ErrorMessage({ message }) {
  return (
    <div className="border border-red-800 rounded-lg overflow-hidden">
      <div className="px-3 py-1.5 bg-red-950/50 border-b border-red-800 text-red-400 text-xs font-medium">
        Error
      </div>
      <div className="px-3 py-2 text-sm text-red-300">{message}</div>
    </div>
  );
}
