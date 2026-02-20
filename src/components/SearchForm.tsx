"use client";

import { useEffect, useRef, useState } from "react";
import { ContentType } from "@/lib/types";
import ContentTypeSelector from "./ContentTypeSelector";

const QUERY_MAX_LENGTH = 200;

export type SearchMode = "list" | "journey";

interface SearchFormProps {
  onSubmit: (
    query: string,
    type: ContentType | ContentType[],
    mode?: SearchMode,
  ) => void;
  isLoading: boolean;
  selectedType: ContentType | ContentType[];
  onTypeChange: (type: ContentType | ContentType[]) => void;
  quickSuggestions: string[];
}

export default function SearchForm({
  onSubmit,
  isLoading,
  selectedType,
  onTypeChange,
  quickSuggestions,
}: SearchFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nextIndexRef = useRef<number>(0);
  const [query, setQuery] = useState("");

  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isPlaceholderFading, setIsPlaceholderFading] = useState(false);

  const ideas = quickSuggestions.slice(0, 5);
  const isEmpty = !query.trim();

  // Cycle through search ideas as placeholder every 7 seconds when empty
  useEffect(() => {
    if (!isEmpty || ideas.length <= 1) return;
    const interval = setInterval(() => {
      nextIndexRef.current = (suggestionIndex + 1) % ideas.length;
      setIsPlaceholderFading(true);
    }, 7000);
    return () => clearInterval(interval);
  }, [isEmpty, ideas.length, suggestionIndex]);

  const handlePlaceholderFadeEnd = () => {
    if (isPlaceholderFading) {
      setSuggestionIndex(nextIndexRef.current);
      setIsPlaceholderFading(false);
    }
  };

  const handleSubmit = () => {
    const text = query.trim();
    if (text && !isLoading) {
      onSubmit(query.trim(), selectedType);
    }
  };

  return (
    <div className="w-full flex flex-col items-center pb-8 sm:pb-12 mt-4 sm:mt-12">
      <div className="w-full max-w-4xl mx-auto px-0 sm:px-6">
        {/* Content type selector */}
        <div className="mb-4 sm:mb-6 flex flex-col items-center gap-3">
          <ContentTypeSelector
            selected={selectedType}
            onChange={onTypeChange}
          />
        </div>

        <div
          className={`relative rounded-3xl liquid-glass-strong transition-all duration-200 min-h-[140px] sm:min-h-[200px] ${
            isEmpty ? "" : "ring-1 ring-purple-500/40"
          }`}
        >
          <div className="relative min-h-[140px] sm:min-h-[200px] flex flex-col p-4 sm:p-8">
            {/* Custom placeholder overlay with smooth fade transition */}
            {isEmpty && ideas.length > 0 && (
              <div
                className={`absolute inset-0 flex items-start p-5 sm:p-8 pointer-events-none transition-opacity duration-500 z-10 ${
                  isPlaceholderFading ? "opacity-0" : "opacity-100"
                }`}
                onTransitionEnd={handlePlaceholderFadeEnd}
              >
                <span className="text-lg sm:text-2xl text-white/50 leading-relaxed">
                  {ideas[suggestionIndex]}
                </span>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder=""
              maxLength={QUERY_MAX_LENGTH}
              disabled={isLoading}
              className="flex-1 bg-transparent text-lg sm:text-2xl text-white outline-none resize-none min-h-[140px] disabled:opacity-50 caret-white relative"
              aria-label="Tell us what you're craving"
            />
            <div className="flex items-center justify-between gap-2 mt-4">
              <span
                className={`shrink-0 text-xs font-medium tabular-nums transition-colors ${
                  query.length > 0 ? "text-white/60" : "text-white/40"
                }`}
              >
                {query.length}/{QUERY_MAX_LENGTH}
              </span>
              <div className="flex items-center gap-2">
                {!isEmpty && (
                  <button
                    onClick={() => setQuery("")}
                    className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                    aria-label="Clear"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
                {isLoading ? (
                  <div className="w-10 h-10 border-2 border-white/20 border-t-purple-400 rounded-full animate-spin" />
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={!query.trim()}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-purple-500/30"
                    aria-label="Search"
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI disclaimer */}
        <div className="flex items-center justify-center gap-2 mt-4 sm:mt-6">
          <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-purple-500/25 text-purple-300 border border-purple-500/30">
            AI
          </span>
          <span className="text-sm text-white/45">
            cravemedia may create unexpected results.
          </span>
        </div>
      </div>
    </div>
  );
}
