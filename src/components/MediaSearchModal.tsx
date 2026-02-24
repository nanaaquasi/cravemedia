import { useState, useEffect } from "react";
import { X, Search, Loader2 } from "lucide-react";
import Image from "next/image";
import { EnrichedRecommendation } from "@/lib/types";

interface MediaSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: EnrichedRecommendation) => void;
}

export default function MediaSearchModal({
  isOpen,
  onClose,
  onSelect,
}: MediaSearchModalProps) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [results, setResults] = useState<EnrichedRecommendation[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setType("all");
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length > 2) {
        setIsSearching(true);
        try {
          const res = await fetch(
            `/api/search/media?q=${encodeURIComponent(query)}&type=${type}`,
          );
          if (res.ok) {
            const data = await res.json();
            setResults(data.items || []);
          }
        } catch (error) {
          console.error("Search failed:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, type]);

  if (!isOpen) return null;

  const contentTypes = [
    { id: "all", label: "All" },
    { id: "movie", label: "Movies" },
    { id: "tv", label: "TV Shows" },
    { id: "book", label: "Books" },
    { id: "anime", label: "Anime" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-semibold text-white">Search Media</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 pb-2 shrink-0 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <input
              type="text"
              autoFocus
              placeholder="Search for movies, books, TV shows..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all shadow-inner"
            />
            {isSearching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-500 w-5 h-5 animate-spin" />
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {contentTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                  type === t.id
                    ? "bg-white text-black border-transparent"
                    : "bg-transparent text-zinc-400 border-white/10 hover:text-white hover:border-white/30"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {query.trim().length > 2 ? (
            results.length > 0 ? (
              <div className="space-y-3 mt-4">
                {results.map((item, idx) => (
                  <button
                    key={`${item.externalId}-${idx}`}
                    onClick={() => onSelect(item)}
                    className="w-full text-left bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-xl p-3 flex gap-4 transition-all group"
                  >
                    <div className="w-16 h-24 bg-black/50 rounded-lg overflow-hidden shrink-0 relative">
                      {item.posterUrl ? (
                        <Image
                          src={item.posterUrl}
                          alt={item.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs text-center p-2">
                          No cover
                        </div>
                      )}
                    </div>
                    <div className="flex-1 py-1 flex flex-col min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-semibold text-white truncate">
                          {item.title}
                        </h3>
                        {item.year && (
                          <span className="text-xs text-zinc-400 shrink-0">
                            {item.year}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 truncate mt-0.5">
                        {item.creator}
                      </p>
                      <p className="text-xs text-zinc-500 mt-auto line-clamp-2">
                        {item.description || "No description available."}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-zinc-300 font-medium h-fit">
                          {item.type}
                        </span>
                        {item.rating && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-500 font-medium flex items-center gap-1 h-fit">
                            ★ {item.rating}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : !isSearching ? (
              <div className="mt-12 text-center text-zinc-500">
                <p>No results found for "{query}"</p>
                <p className="text-sm mt-1">
                  Try a different search term or type
                </p>
              </div>
            ) : null
          ) : (
            <div className="mt-12 text-center text-zinc-500 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <Search className="w-8 h-8 text-zinc-600" />
              </div>
              <p>Type at least 3 characters to search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
