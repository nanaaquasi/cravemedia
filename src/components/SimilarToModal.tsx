"use client";

import { useState, useEffect } from "react";
import { X, Search, Loader2 } from "lucide-react";
import Image from "next/image";
import { EnrichedRecommendation, ContentType } from "@/lib/types";
import { SearchMode } from "@/components/SearchForm";
import { getTypeLabel } from "@/config/media-types";

interface SimilarToModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFindSimilar: (params: {
    items: EnrichedRecommendation[];
    mood?: string;
    mode: SearchMode;
    type: ContentType;
    synthesizedQuery: string;
  }) => void;
}

const MAX_SELECTIONS = 3;
const contentTypes = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "TV Shows" },
  { id: "book", label: "Books" },
  { id: "anime", label: "Anime" },
];

function deriveType(items: EnrichedRecommendation[]): ContentType {
  if (items.length === 0) return "all";
  const first = items[0];
  return (first?.type as ContentType) ?? "all";
}

function buildQuery(items: EnrichedRecommendation[], mood?: string): string {
  if (items.length === 0) return "";
  const typeLabel = getTypeLabel(deriveType(items));
  if (items.length === 1) {
    const item = items[0];
    const base = `More ${typeLabel} like "${item.title}" by ${item.creator}`;
    return mood?.trim() ? `${base} - ${mood.trim()}` : base;
  }
  const titles = items.map((i) => `"${i.title}"`).join(", ");
  const base = `More ${typeLabel} like ${titles}`;
  return mood?.trim() ? `${base} - ${mood.trim()}` : base;
}

export default function SimilarToModal({
  isOpen,
  onClose,
  onFindSimilar,
}: SimilarToModalProps) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [results, setResults] = useState<EnrichedRecommendation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItems, setSelectedItems] = useState<EnrichedRecommendation[]>(
    [],
  );
  const [mood, setMood] = useState("");
  const [mode, setMode] = useState<SearchMode>("list");

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setType("all");
      setSelectedItems([]);
      setMood("");
      setMode("list");
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

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

  const addItem = (item: EnrichedRecommendation) => {
    if (selectedItems.length >= MAX_SELECTIONS) return;
    if (selectedItems.some((s) => s.externalId === item.externalId)) return;
    setSelectedItems((prev) => [...prev, item]);
  };

  const removeItem = (idx: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const derivedType = deriveType(selectedItems);
  const handleFindSimilar = () => {
    if (selectedItems.length === 0) return;
    const synthesizedQuery = buildQuery(selectedItems, mood);
    onFindSimilar({
      items: selectedItems,
      mood: mood.trim() || undefined,
      mode,
      type: derivedType,
      synthesizedQuery,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity overflow-hidden"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between shrink-0 gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Find similar to...
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              Pick movies, books, or shows you love and we&apos;ll find more
              like them.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="space-y-1.5 shrink-0  mb-4">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {contentTypes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                    type === t.id
                      ? "bg-white text-black border-transparent"
                      : "bg-transparent text-zinc-400 border-white/10 hover:text-white hover:border-white/30"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {type === "all" && (
              <p className="text-xs text-zinc-500">
                Tip: Select a type (Movies, TV, etc.) for more accurate results
              </p>
            )}
          </div>

          <div className="relative shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <input
              type="text"
              autoFocus
              placeholder="Search for movies, books, TV shows..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`w-full bg-black/50 border border-white/10 rounded-xl pl-12 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all shadow-inner ${
                query ? "pr-12" : "pr-4"
              }`}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            ) : null}
          </div>

          {/* Search results dropdown - directly below search input */}
          <div className="mt-2 overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-black/30 max-h-[220px] shrink-0">
            {query.trim().length > 2 ? (
              results.length > 0 ? (
                <div className="space-y-1 p-2">
                  {results.map((item, idx) => {
                    const isSelected = selectedItems.some(
                      (s) => s.externalId === item.externalId,
                    );
                    const canAdd =
                      selectedItems.length < MAX_SELECTIONS && !isSelected;
                    return (
                      <button
                        key={`${item.externalId}-${idx}`}
                        onClick={() => canAdd && addItem(item)}
                        disabled={!canAdd}
                        className={`w-full text-left rounded-lg p-2 flex gap-3 transition-all group ${
                          canAdd
                            ? "bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 cursor-pointer"
                            : "bg-white/5 border border-transparent opacity-60 cursor-default"
                        }`}
                      >
                        <div className="w-12 h-16 bg-black/50 rounded overflow-hidden shrink-0 relative">
                          {item.posterUrl ? (
                            <Image
                              src={item.posterUrl}
                              alt={item.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs p-1">
                              No cover
                            </div>
                          )}
                        </div>
                        <div className="flex-1 py-0.5 flex flex-col min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium text-white text-sm truncate">
                              {item.title}
                            </h3>
                            {item.year && (
                              <span className="text-xs text-zinc-400 shrink-0">
                                {item.year}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 truncate">
                            {item.creator}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-medium">
                              {item.type}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">
                                Selected
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : !isSearching ? (
                <div className="p-4 text-center text-zinc-500 text-sm">
                  No results for &quot;{query}&quot;
                </div>
              ) : (
                <div className="p-4 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              )
            ) : (
              <div className="p-4 text-center text-zinc-500 text-sm flex flex-col items-center gap-2">
                <Search className="w-6 h-6 text-zinc-600" />
                <p>Type at least 3 characters to search</p>
                <p className="text-xs">Select up to {MAX_SELECTIONS} items</p>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-4 flex-1 min-h-0 overflow-y-auto overscroll-contain pb-2">
            {selectedItems.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedItems.map((item, idx) => (
                  <span
                    key={`${item.externalId}-${idx}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm"
                  >
                    {item.title}
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-0.5 rounded-full hover:bg-white/20 text-zinc-400 hover:text-white transition-colors"
                      aria-label={`Remove ${item.title}`}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div>
              <label
                htmlFor="similar-mood"
                className="block text-sm text-zinc-400 mb-1"
              >
                Add a mood or feeling (optional)
              </label>
              <input
                id="similar-mood"
                type="text"
                placeholder="e.g. mind-bending and emotional"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
              />
            </div>

            <div>
              <span className="block text-sm text-zinc-400 mb-2">Mode</span>
              <div className="flex gap-2">
                {(["list", "journey"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors border ${
                      mode === m
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                        : "bg-transparent text-zinc-400 border-white/10 hover:text-white hover:border-white/30"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {selectedItems.length > 0 && (
              <div className="text-sm text-zinc-400">
                Type:{" "}
                <span className="text-white">{getTypeLabel(derivedType)}</span>
              </div>
            )}

            <button
              onClick={handleFindSimilar}
              disabled={selectedItems.length === 0}
              className="w-full py-3 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Find Similar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
