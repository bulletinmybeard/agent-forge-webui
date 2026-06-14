export default function ConfigMessage({
  profile,
  provider,
  tools,
  sessionId,
  mode,
  memory_tier: memoryTier,
}) {
  const providerLabel = provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : null;
  const modeLabel = mode ? `@${String(mode).replace(/^custom:/, "")}` : null;

  let memoryValue = null;
  let memoryColor = "text-gray-300";
  if (memoryTier) {
    memoryValue = String(memoryTier);
    memoryColor =
      memoryTier === "none"
        ? "text-rose-400"
        : memoryTier === "session"
          ? "text-amber-400"
          : "text-emerald-400";
  }

  const items = [
    modeLabel && ["Mode", modeLabel, "text-gray-300"],
    memoryValue && ["Memory", memoryValue, memoryColor],
    ["Profile", profile, "text-gray-300"],
    providerLabel && ["Provider", providerLabel, "text-gray-300"],
    ["Tools", `${tools} total`, "text-gray-300"],
    ["Session", sessionId, "text-gray-300"],
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 px-3 py-2 text-xs">
      {items.map(([label, value, color]) => (
        <div key={label}>
          <span className="text-gray-500">{label}</span>
          <span className={`${color} ml-2`}>{value}</span>
        </div>
      ))}
    </div>
  );
}
