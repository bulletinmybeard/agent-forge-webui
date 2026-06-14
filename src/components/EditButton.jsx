export default function EditButton({ onEdit, disabled = false, className = "" }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      disabled={disabled}
      title="Edit prompt"
      className={`inline-flex items-center gap-1 text-gray-500 hover:text-gray-300
                  transition-colors text-xs bg-transparent border-0 cursor-pointer
                  disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
      Edit
    </button>
  );
}
