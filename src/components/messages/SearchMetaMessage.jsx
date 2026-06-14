import { formatElapsed } from "../../lib/formatTime";

export default function SearchMetaMessage({
  refined_query,
  filters,
  result_count,
  dropped_by_floor,
  best_score,
  general_knowledge,
  intent,
  preferred_methods,
  demoted_by_method,
  search_elapsed,
  is_sticky,
  parsed_query,
}) {
  const filterEntries = Object.entries(filters || {});
  const hasFilters = filterEntries.length > 0;
  const hasRefinement = !!refined_query;
  const hasParsedQuery = !!parsed_query;
  const hasDropped = dropped_by_floor > 0;
  const hasDemoted = demoted_by_method > 0;
  const safeScore = typeof best_score === "number" ? best_score : 0;

  return (
    <div className="px-3 py-2 text-xs space-y-1">
      {hasFilters && (
        <div className="text-gray-400">
          {is_sticky ? (
            <span className="text-amber-500/80 font-medium">sticky: </span>
          ) : (
            <span className="text-gray-500">Filters: </span>
          )}
          {filterEntries.map(([key, val], i) => (
            <span key={key}>
              {i > 0 && ", "}
              <span className="text-yellow-500/80">{key}</span>
              <span className="text-gray-600">=</span>
              <span className="text-yellow-400">{val}</span>
            </span>
          ))}
        </div>
      )}

      {hasParsedQuery && (
        <div className="text-gray-400">
          <span className="text-gray-500">Searching for:</span>{" "}
          <span className="text-gray-300">{parsed_query}</span>
        </div>
      )}

      {hasRefinement && (
        <div className="text-gray-400">
          <span className="text-gray-500">Refined:</span>{" "}
          <span className="text-blue-400">{refined_query}</span>
        </div>
      )}

      {intent && (
        <div className="text-gray-400">
          <span className="text-gray-500">Intent:</span>{" "}
          <span className="text-purple-400">{intent}</span>
          {preferred_methods && preferred_methods.length > 0 && (
            <span className="text-gray-500">
              {" → prefers "}
              {preferred_methods.join(", ")}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-gray-500">
        <span>
          Results: <span className="text-gray-400">{result_count}</span>
        </span>

        {hasDropped && (
          <span>
            Filtered out: <span className="text-orange-400/80">{dropped_by_floor}</span>
            <span className="text-gray-600"> low-relevance</span>
          </span>
        )}

        {hasDemoted && (
          <span>
            Demoted: <span className="text-orange-400/80">{demoted_by_method}</span>
            <span className="text-gray-600"> by method</span>
          </span>
        )}

        <span>
          Best score:{" "}
          <span
            className={
              safeScore >= 0.75
                ? "text-green-400"
                : safeScore >= 0.6
                  ? "text-yellow-400"
                  : "text-red-400/80"
            }
          >
            {safeScore.toFixed(4)}
          </span>
        </span>

        <span>
          Search: <span className="text-gray-400">{formatElapsed(search_elapsed)}</span>
        </span>

        {general_knowledge && (
          <span className="text-amber-400/80 font-medium">→ general knowledge mode</span>
        )}
      </div>
    </div>
  );
}
