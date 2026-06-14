import { useEffect, useState } from "react";

export default function ProfileModal({ open, onClose, profiles, overrides, onSave, allModels }) {
  const [local, setLocal] = useState({});

  useEffect(() => {
    if (open && profiles) {
      const merged = {};
      for (const [name, prof] of Object.entries(profiles)) {
        merged[name] = {
          model: overrides?.[name]?.model ?? prof.model,
          temperature: overrides?.[name]?.temperature ?? prof.temperature,
          max_tokens: overrides?.[name]?.max_tokens ?? prof.max_tokens,
        };
      }
      setLocal(merged);
    }
  }, [open, profiles, overrides]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !profiles) return null;

  const handleModelChange = (profileName, model) => {
    setLocal((prev) => ({
      ...prev,
      [profileName]: { ...prev[profileName], model },
    }));
  };

  const handleTempChange = (profileName, val) => {
    const temperature = parseFloat(val);
    if (!Number.isNaN(temperature)) {
      setLocal((prev) => ({
        ...prev,
        [profileName]: { ...prev[profileName], temperature },
      }));
    }
  };

  const handleSave = () => {
    const changed = {};
    for (const [name, vals] of Object.entries(local)) {
      const base = profiles[name];
      if (vals.model !== base.model || vals.temperature !== base.temperature) {
        changed[name] = vals;
      }
    }
    onSave(changed);
    onClose();
  };

  const handleReset = () => {
    const merged = {};
    for (const [name, prof] of Object.entries(profiles)) {
      merged[name] = {
        model: prof.model,
        temperature: prof.temperature,
        max_tokens: prof.max_tokens,
      };
    }
    setLocal(merged);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg mx-4
                      max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-200">Profile Overrides</h2>
          <span className="text-[10px] text-gray-500">Changes apply to this session only</span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {Object.entries(local).map(([name, vals]) => {
            const base = profiles[name];
            const modelChanged = vals.model !== base.model;
            const tempChanged = vals.temperature !== base.temperature;
            const isModified = modelChanged || tempChanged;

            return (
              <div
                key={name}
                className={`rounded-lg p-3 border transition-colors ${
                  isModified
                    ? "border-indigo-500/40 bg-indigo-950/20"
                    : "border-gray-800 bg-gray-800/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-300">{name}</span>
                  {isModified && (
                    <span className="text-[9px] text-indigo-400 uppercase tracking-wide">
                      Modified
                    </span>
                  )}
                </div>

                <div className="mb-2">
                  <label className="block text-[10px] text-gray-500 mb-0.5">Model</label>
                  <select
                    value={vals.model}
                    onChange={(e) => handleModelChange(name, e.target.value)}
                    className="w-full text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1
                               text-gray-300 focus:outline-none focus:border-indigo-500"
                  >
                    {allModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 mb-0.5">
                    Temperature: {vals.temperature.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={vals.temperature}
                    onChange={(e) => handleTempChange(name, e.target.value)}
                    className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer
                               accent-indigo-500"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Reset to defaults
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg
                         hover:bg-indigo-500 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
