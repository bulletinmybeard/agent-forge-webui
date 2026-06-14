export const CanvasTab = ({ itemCount, isOpen, onToggle, width = 340 }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`absolute z-[52] flex flex-col items-center justify-center gap-1.5 rounded-l px-1 py-3 cursor-pointer select-none ${
        isOpen ? "bg-indigo-600" : "bg-indigo-500 hover:bg-indigo-600"
      }`}
      style={{
        top: "50%",
        transform: "translateY(-50%)",
        width: "22px",
        right: isOpen ? `${width}px` : "0",
      }}
      aria-label={isOpen ? "Close canvas" : "Open canvas"}
      title="Session Canvas"
    >
      <span
        className="text-white font-semibold tracking-widest"
        style={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          fontSize: "9px",
          lineHeight: 1,
          letterSpacing: "0.15em",
        }}
      >
        CANVAS
      </span>

      {itemCount > 0 && (
        <span
          className="text-white font-mono rounded"
          style={{
            fontSize: "9px",
            lineHeight: 1,
            background: "rgba(255,255,255,0.2)",
            padding: "1px 3px",
          }}
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </button>
  );
};
