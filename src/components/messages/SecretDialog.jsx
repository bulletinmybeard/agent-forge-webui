import { useState } from "react";

export default function SecretDialog({ type, prompt, onSubmit, cancelled }) {
  const [value, setValue] = useState("");

  if (type === "secret_answer") {
    return (
      <div className="flex items-center gap-2 text-sm py-1">
        <span className={cancelled ? "text-red-400" : "text-emerald-400"}>
          {cancelled ? "✗" : "✓"}
        </span>
        <span className={cancelled ? "text-red-400" : "text-emerald-400"}>
          {cancelled ? "password entry cancelled" : "sudo password entered"}
        </span>
      </div>
    );
  }

  return (
    <div className="border border-amber-700 rounded-lg overflow-hidden">
      <div className="px-3 py-1.5 bg-amber-950/50 border-b border-amber-800 text-amber-400 text-xs font-medium">
        Password Required
      </div>
      <div className="px-3 py-3">
        <div className="mb-2 text-sm text-gray-200">{prompt}</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(value);
          }}
        >
          <input
            type="password"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded bg-gray-900 border border-gray-700 px-2 py-1 text-gray-100 text-sm"
            placeholder="sudo password"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              className="px-3 py-1 text-xs font-medium text-white bg-amber-600 rounded hover:bg-amber-500 transition-colors"
            >
              Submit
            </button>
            <button
              type="button"
              className="px-3 py-1 text-xs font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 transition-colors"
              onClick={() => onSubmit(null, true)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
