"use client";

import {
  useCallback,
  useEffect,
  useDeferredValue,
  useRef,
  useState,
} from "react";
import { SUGGESTION_CATEGORIES } from "@/config/suggestion-categories";
import { X, Plus } from "lucide-react";

const QUERY_MAX_LENGTH = 200;
const PROMPTS_PER_CATEGORY = 5;

/** Fisher-Yates shuffle, then take first n unique items. */
function shuffleAndTake<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

export type SearchMode = "list" | "journey";

interface SearchFormProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
  /** Placeholder prompts for typewriter effect (e.g. PLACEHOLDER_PROMPTS). */
  placeholderPrompts?: readonly string[];
  /** Optional label above the input (e.g. "WHAT ARE YOU CRAVING?") */
  labelText?: string;
  /** Optional callback when user clicks "Similar To" button */
  onSimilarToClick?: () => void;
}

const TYPING_SPEED_MS = 55;
const PAUSE_BETWEEN_PHRASES_MS = 2500;

const ALL_PROMPTS_FALLBACK = SUGGESTION_CATEGORIES.flatMap((c) =>
  c.prompts.slice(0, 2),
);

export default function SearchForm({
  onSubmit,
  isLoading,
  placeholderPrompts,
  labelText,
  onSimilarToClick,
}: SearchFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(
    null,
  );
  const [displayedPrompts, setDisplayedPrompts] = useState<string[]>([]);

  const handleCategoryToggle = useCallback((catId: string) => {
    setExpandedCategoryId((prev) => {
      if (prev === catId) return null;
      const cat = SUGGESTION_CATEGORIES.find((c) => c.id === catId);
      if (cat) {
        setDisplayedPrompts(shuffleAndTake(cat.prompts, PROMPTS_PER_CATEGORY));
      }
      return catId;
    });
  }, []);

  // Always use PLACEHOLDER_PROMPTS for typewriter; fallback only if not provided
  const phrases = (placeholderPrompts ?? ALL_PROMPTS_FALLBACK).slice(0, 6);
  const [displayedText, setDisplayedText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use query (not deferredQuery) for isEmpty so typewriter stops immediately on first keystroke.
  // deferredQuery would lag and keep typewriter firing, competing with input updates and causing typing delay.
  const isEmpty = !query.trim();
  const expandedCategory = SUGGESTION_CATEGORIES.find(
    (c) => c.id === expandedCategoryId,
  );

  const handleChipClick = (suggestion: string) => {
    if (!isLoading) {
      onSubmit(suggestion.trim());
    }
  };

  // Typewriter effect: plays PLACEHOLDER_PROMPTS when input is empty
  useEffect(() => {
    const list = (placeholderPrompts ?? ALL_PROMPTS_FALLBACK).slice(0, 8);
    if (list.length === 0 || !isEmpty) return;

    const phrase = list[phraseIndex];
    let charIndex = displayedText.length;

    const tick = () => {
      if (charIndex < phrase.length) {
        setDisplayedText(phrase.slice(0, charIndex + 1));
        charIndex++;
        timeoutRef.current = setTimeout(tick, TYPING_SPEED_MS);
      } else {
        timeoutRef.current = setTimeout(() => {
          setPhraseIndex((i) => (i + 1) % list.length);
          setDisplayedText("");
        }, PAUSE_BETWEEN_PHRASES_MS);
      }
    };

    tick();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    // displayedText.length used only to init charIndex when resuming; omit to avoid re-running on every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmpty, phraseIndex, placeholderPrompts]);

  const handleSubmit = () => {
    const text = query.trim();
    if (text && !isLoading) {
      onSubmit(query.trim());
    }
  };

  return (
    <div className="w-full flex flex-col items-center pb-8 sm:pb-8 mt-4 sm:mt-6 px-2 sm:px-0">
      <div className="w-full max-w-3xl mx-auto sm:px-6">
        <div
          className={`relative rounded-3xl border border-white/25 bg-white/3 sm:backdrop-blur-md transition-colors duration-200 min-h-[100px] sm:min-h-[200px] ${
            isEmpty ? "" : "border-white/0 bg-white/5 ring-0"
          }`}
        >
          <div className="relative min-h-[100px] sm:min-h-[200px] flex flex-col p-4 sm:p-4">
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
              className="flex-1 bg-transparent text-lg sm:text-2xl text-white outline-none resize-none min-h-[100px] disabled:opacity-50 caret-white relative z-0"
              aria-label="Tell us what you're craving"
            />
            {/* Typewriter placeholder overlay - on top when empty */}
            {isEmpty && phrases.length > 0 && (
              <div className="absolute inset-0 flex items-start p-5 sm:p-8 pointer-events-none z-10">
                <span className="text-lg sm:text-2xl text-white/50 leading-relaxed">
                  {displayedText || phrases[0]}
                  <span className="animate-pulse">|</span>
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 mt-4">
              <div className="flex items-center gap-2 shrink-0">
                {onSimilarToClick && (
                  <button
                    type="button"
                    onClick={onSimilarToClick}
                    title="Similar To"
                    aria-label="Similar To"
                    className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
                <span
                  className={`hidden text-xs font-medium tabular-nums transition-colors ${
                    deferredQuery.length > 0 ? "text-white/40" : "text-white/40"
                  }`}
                >
                  {deferredQuery.length}/{QUERY_MAX_LENGTH}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!isEmpty && (
                  <button
                    onClick={() => {
                      setQuery("");
                      textareaRef.current?.focus();
                    }}
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
                    disabled={!deferredQuery.trim()}
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

        {/* Category chips + expand panel */}
        <div className="mt-4 sm:mt-5 relative">
          <div className="overflow-x-auto scrollbar-hide pb-2 sm:px-0 min-w-0">
            <div className="flex gap-2 sm:flex-wrap sm:justify-center min-w-max sm:min-w-0">
              {SUGGESTION_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isExpanded = expandedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryToggle(cat.id)}
                    disabled={isLoading}
                    className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border ${
                      isExpanded
                        ? "bg-white/15 text-white border-white/30"
                        : "text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dropdown overlays categories */}
          {expandedCategory && (
            <div
              className="absolute left-0 right-0 top-0 z-20 rounded-2xl border border-white/15 bg-[#0a0a0d]/95 backdrop-blur-md overflow-hidden shadow-xl shadow-black/50"
              role="dialog"
              aria-label={`${expandedCategory.label} suggestions`}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = expandedCategory.icon;
                    return <Icon className="w-4 h-4 text-white/70" />;
                  })()}
                  <h3 className="text-sm font-semibold text-white">
                    {expandedCategory.label}
                  </h3>
                </div>
                <button
                  onClick={() => setExpandedCategoryId(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ul className="divide-y divide-white/5 max-h-[240px] overflow-y-auto overflow-x-hidden">
                {displayedPrompts.map((prompt) => (
                  <li key={prompt}>
                    <button
                      onClick={() => {
                        handleChipClick(prompt);
                        setExpandedCategoryId(null);
                      }}
                      disabled={isLoading}
                      className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed break-words"
                    >
                      {prompt}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* AI disclaimer */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-4 sm:mt-6 text-center sm:text-left">
          <span className="shrink-0 text-xs font-semibold px-2 py-1 rounded-full bg-purple-500/25 text-purple-300 border border-purple-500/30">
            AI
          </span>
          <span className="text-xs text-white/45">
            craveo uses AI to personalize results — responses may occasionally
            miss the mark
          </span>
        </div>
      </div>
    </div>
  );
}
