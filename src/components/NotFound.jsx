import { Link } from "react-router-dom";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("Page not found");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-gray-200 px-6">
      <p className="text-5xl font-semibold text-gray-100">404</p>
      <p className="mt-3 text-gray-400 text-sm">This page doesn&apos;t exist.</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm
                   bg-gray-800 border border-gray-700 text-gray-200
                   hover:border-gray-600 hover:text-gray-100 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>Back to chat</span>
      </Link>
    </div>
  );
}
