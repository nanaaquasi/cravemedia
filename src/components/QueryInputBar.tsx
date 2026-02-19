"use client";

import { useState, useRef, useEffect } from "react";
import { ContentType } from "@/lib/types";

interface QueryInputBarProps {
  onSubmit: (query: string, type: ContentType) => void;
  isLoading: boolean;
  selectedType: ContentType;
  suggestions?: string[];
  quickSuggestions?: string[];
  showSuggestionsByDefault?: boolean;
}

const placeholders = [
  "Dark psychological thrillers that make you question reality...",
  "Cozy books perfect for a rainy Sunday...",
  "TV shows like Breaking Bad but with dark humor...",
  "Uplifting stories about unlikely friendships...",
  "Mind-bending sci-fi that explores time travel...",
  "Feel-good rom-coms from the 90s...",
];

export default function QueryInputBar({
  onSubmit,
  isLoading,
  selectedType,
  suggestions = [],
  quickSuggestions = [],
  showSuggestionsByDefault = false,
}: QueryInputBarProps) {
  const [query, setQuery] = useState("");
  const [placeholder, setPlaceholder] = useState(placeholders[0]);
  const [showSuggestions, setShowSuggestions] = useState(
    showSuggestionsByDefault,
  );

  // Rotate placeholder after mount (client-only) to avoid hydration mismatch
  useEffect(() => {
    const interval = setInterval(
      () =>
        setPlaceholder(
          placeholders[Math.floor(Math.random() * placeholders.length)],
        ),
      5000,
    );
    return () => clearInterval(interval);
  }, []);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasQuickSuggestions = quickSuggestions.length > 0;
  const hasRecentSuggestions = suggestions.length > 0;
  const shouldShowSuggestions =
    showSuggestions && (hasQuickSuggestions || hasRecentSuggestions);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSubmit = () => {
    if (query.trim() && !isLoading) {
      onSubmit(query.trim(), selectedType);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleSuggestionClick = (text: string) => {
    setQuery(text);
    setShowSuggestions(false);
    onSubmit(text, selectedType);
    inputRef.current?.focus();
  };

  const typeIcon =
    selectedType === "all"
      ? "✦"
      : selectedType === "movie"
        ? "🎬"
        : selectedType === "tv"
          ? "📺"
          : "📚";

  const suggestionsInline = showSuggestionsByDefault && shouldShowSuggestions;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Suggestions - above input when dropdown, below when inline (bottom sheet) */}
      {shouldShowSuggestions && !showSuggestionsByDefault && (
        <div className="absolute bottom-full left-0 right-0 mb-3 max-h-64 overflow-y-auto z-10">
          <div className="rounded-2xl overflow-hidden liquid-glass-strong shadow-2xl">
            {hasQuickSuggestions && (
              <div className="p-3">
                <p className="px-3 pb-2 text-sm font-medium text-white/50 uppercase tracking-wider">
                  New search ideas
                </p>
                <div className="space-y-1.5">
                  {quickSuggestions.slice(0, 5).map((text, i) => (
                    <button
                      key={`quick-${i}`}
                      onClick={() => handleSuggestionClick(text)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer text-left group"
                    >
                      <span className="text-xl flex-shrink-0 opacity-80 group-hover:opacity-100">
                        {typeIcon}
                      </span>
                      <span className="text-base text-white/90 group-hover:text-white font-medium truncate">
                        {text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {hasRecentSuggestions && (
              <div className="p-3 border-t border-white/[0.06]">
                <p className="px-3 pb-2 text-sm font-medium text-white/50 uppercase tracking-wider">
                  Recent searches
                </p>
                <div className="space-y-1.5">
                  {suggestions.slice(0, 5).map((text, i) => (
                    <button
                      key={`recent-${i}`}
                      onClick={() => handleSuggestionClick(text)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer text-left group"
                    >
                      <span className="text-lg flex-shrink-0 text-white/40 group-hover:text-white/60">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      </span>
                      <span className="text-base text-white/80 group-hover:text-white truncate">
                        {text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main input bar - frosted glass, Apple Music Playground style */}
      <div className="rounded-2xl overflow-hidden">
        <div
          className={`flex items-center gap-3 rounded-2xl px-4 py-4 transition-all duration-200 ${
            isFocused
              ? "bg-white/8 border border-white/12 shadow-lg shadow-black/20"
              : "bg-white/5 border border-white/6"
          }`}
        >
          <span className="text-2xl shrink-0 opacity-90 drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">
            {typeIcon}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(e.target.value.length === 0);
            }}
            onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={500}
            disabled={isLoading}
            className="flex-1 bg-transparent text-base md:text-lg text-white placeholder:text-white/50 outline-none disabled:opacity-50 min-w-0"
            aria-label="Tell us what you're craving"
          />
          <div className="flex items-center gap-1 shrink-0">
            {query.length > 0 && (
              <button
                onClick={() => setQuery("")}
                className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                aria-label="Clear"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-purple-400 rounded-full animate-spin" />
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!query.trim()}
                className="p-2.5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 hover:scale-105 transition-all cursor-pointer shadow-lg shadow-purple-500/20"
                aria-label="Search"
              >
                <svg
                  width="16"
                  height="16"
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

        {/* BETA / AI disclaimer - Apple Music style */}
        <div className="flex items-center gap-2 mt-3 px-1">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
            AI
          </span>
          <span className="text-sm text-white/50">
            cravemedia may create unexpected results.
          </span>
        </div>
      </div>

      {/* Inline suggestions (for bottom sheet) - below input */}
      {suggestionsInline && (
        <div className="mt-5 space-y-5">
          {hasQuickSuggestions && (
            <div>
              <p className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3 px-1">
                New search ideas
              </p>
              <div className="space-y-2">
                {quickSuggestions.slice(0, 5).map((text, i) => (
                  <button
                    key={`quick-inline-${i}`}
                    onClick={() => handleSuggestionClick(text)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer text-left group"
                  >
                    <span className="text-xl flex-shrink-0 opacity-80 group-hover:opacity-100">
                      {typeIcon}
                    </span>
                    <span className="text-base text-white/90 group-hover:text-white truncate">
                      {text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {hasRecentSuggestions && (
            <div>
              <p className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3 px-1">
                Recent searches
              </p>
              <div className="space-y-2">
                {suggestions.slice(0, 5).map((text, i) => (
                  <button
                    key={`recent-inline-${i}`}
                    onClick={() => handleSuggestionClick(text)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer text-left group"
                  >
                    <span className="text-lg flex-shrink-0 text-white/40 group-hover:text-white/60">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </span>
                    <span className="text-base text-white/80 group-hover:text-white truncate">
                      {text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
