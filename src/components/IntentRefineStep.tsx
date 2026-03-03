"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefineQuestion, RefineAnswer, ContentType } from "@/lib/types";
import { ensureQueryReflectsTypes } from "@/lib/query-utils";
import { SearchMode } from "@/components/SearchForm";
import { ENABLED_MEDIA_TYPES } from "@/config/media-types";

const TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: "all", label: "All" },
  ...ENABLED_MEDIA_TYPES.map((v) => ({
    value: v as ContentType,
    label:
      v === "movie"
        ? "Movies"
        : v === "tv"
          ? "TV Shows"
          : v === "book"
            ? "Books"
            : "Anime",
  })),
];

function formatTypeLabel(type: ContentType | ContentType[]): string {
  if (type === "all") return "All";
  const arr = Array.isArray(type) ? type : [type];
  return arr
    .map((t) =>
      t === "movie"
        ? "Movies"
        : t === "tv"
          ? "TV Shows"
          : t === "book"
            ? "Books"
            : t === "anime"
              ? "Anime"
              : "All",
    )
    .join(", ");
}

/** Format type for natural sentence: "Movies and TV Shows" or "TV Shows" */
function formatTypeForSentence(type: ContentType | ContentType[]): string {
  if (type === "all") return "recommendations";
  const arr = Array.isArray(type) ? type : [type];
  const labels = arr.map((t) =>
    t === "movie"
      ? "Movies"
      : t === "tv"
        ? "TV Shows"
        : t === "book"
          ? "Books"
          : t === "anime"
            ? "Anime"
            : "All",
  );
  if (labels.length <= 1) return labels[0] ?? "recommendations";
  return labels.slice(0, -1).join(", ") + " and " + labels[labels.length - 1];
}

/** Normalize query to flow as a phrase in a sentence (strip leading filler, punctuation) */
function normalizeQueryForSentence(query: string): string {
  let q = query.trim().replace(/\?+$/, "").trim();
  const prefixes = [
    /^what'?s\s+/i,
    /^what is\s+/i,
    /^i want\s+/i,
    /^make me\s+/i,
    /^show me\s+/i,
    /^give me\s+/i,
    /^i need\s+/i,
    /^something\s+/i,
  ];
  for (const re of prefixes) {
    q = q.replace(re, "");
  }
  return q.trim() || query.trim();
}

interface IntentRefineStepProps {
  questions: RefineQuestion[];
  round: number;
  isLoading: boolean;
  onSubmitAnswers: (answers: RefineAnswer[]) => void;
  onSkip: () => void;
  onModeSelected: (mode: SearchMode) => void;
  onTypeSelected: (type: ContentType | ContentType[]) => void;
  showTypeSelect: boolean;
  showModeSelect: boolean;
  initialTypeSelection: ContentType | ContentType[];
  /** Original query — shown throughout the flow for recognition over recall */
  initialQuery?: string;
  /** Selected type after user picks — shown on mode select + AI steps */
  selectedType?: ContentType | ContentType[];
  /** Selected mode after user picks — shown on AI steps */
  selectedMode?: SearchMode;
  /** Previous answers from earlier questions — shown during AI question flow */
  previousAnswers?: RefineAnswer[];
}

/* ─── shared background ────────────────────────────────────────────────── */
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute top-[20%] left-[25%] rounded-full w-[350px] h-[350px] -translate-x-1/2 -translate-y-1/2 will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(88,28,135,0.45) 0%, transparent 70%)",
          filter: "blur(120px)",
        }}
        animate={{
          x: [0, 60, -40, 0],
          y: [0, -40, 50, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[60%] left-[65%] rounded-full w-[320px] h-[320px] -translate-x-1/2 -translate-y-1/2 will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(190,24,93,0.4) 0%, transparent 70%)",
          filter: "blur(120px)",
        }}
        animate={{
          x: [0, -50, 40, 0],
          y: [0, 30, -45, 0],
          scale: [1, 0.95, 1.1, 1],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />
    </div>
  );
}

/* ─── Persistent context bar (recognition over recall) ───────────────────── */
function ContextBar({
  initialQuery,
  selectedType,
  selectedMode,
  previousAnswers,
}: {
  initialQuery?: string;
  selectedType?: ContentType | ContentType[];
  selectedMode?: SearchMode;
  previousAnswers?: RefineAnswer[];
}) {
  const rawQuery = initialQuery?.trim();
  if (!rawQuery) return null;

  const query = ensureQueryReflectsTypes(rawQuery, selectedType ?? "all");
  const queryPhrase = normalizeQueryForSentence(query);
  const typeStr = selectedType
    ? formatTypeForSentence(selectedType)
    : "recommendations";
  const modeStr =
    selectedMode === "journey" ? "journey" : selectedMode === "list" ? "list" : null;

  let sentence: string;
  if (modeStr && selectedType) {
    sentence = `A ${modeStr} of ${typeStr}: ${queryPhrase}`;
  } else if (selectedType) {
    sentence = `${typeStr}: ${queryPhrase}`;
  } else {
    sentence = queryPhrase;
  }

  const answerSuffix =
    previousAnswers && previousAnswers.length > 0
      ? previousAnswers
          .map((a) => a.selected.join(", "))
          .join(" • ")
      : null;

  return (
    <div
      className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-white/60 max-w-2xl rounded-2xl bg-pink-500/10 backdrop-blur-md border border-pink-500/20 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <span className="text-white/40 text-xs uppercase tracking-wider mr-1">
        Your craving
      </span>
      <span className="text-white/30" aria-hidden>
        —
      </span>
      <span className="text-center">
        {sentence}
        {answerSuffix && (
          <>
            <span className="text-white/40 mx-1">·</span>
            <span className="text-white/50">{answerSuffix}</span>
          </>
        )}
      </span>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────── */

export default function IntentRefineStep({
  questions,
  round,
  isLoading,
  onSubmitAnswers,
  onSkip,
  onModeSelected,
  onTypeSelected,
  showTypeSelect,
  showModeSelect,
  initialTypeSelection,
  initialQuery,
  selectedType,
  selectedMode,
  previousAnswers,
}: IntentRefineStepProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  const [typeSelections, setTypeSelections] = useState<ContentType[]>(() => {
    const arr = Array.isArray(initialTypeSelection)
      ? initialTypeSelection
      : [initialTypeSelection];
    return arr.includes("all") ? ["all"] : arr;
  });

  // Only sync from parent when entering type select; don't reset when leaving
  useEffect(() => {
    if (!showTypeSelect) return;
    const arr = Array.isArray(initialTypeSelection)
      ? initialTypeSelection
      : [initialTypeSelection];
    setTypeSelections(arr.includes("all") ? ["all"] : arr);
  }, [initialTypeSelection, showTypeSelect]);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  const toggleOption = useCallback(
    (questionId: string, option: string, multiSelect: boolean) => {
      setSelections((prev) => {
        const current = prev[questionId] || [];
        if (multiSelect) {
          const exists = current.includes(option);
          return {
            ...prev,
            [questionId]: exists
              ? current.filter((o) => o !== option)
              : [...current, option],
          };
        } else {
          return {
            ...prev,
            [questionId]: current.includes(option) ? [] : [option],
          };
        }
      });
    },
    [],
  );

  const handleContinue = useCallback(() => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex((i) => i + 1);
      return;
    }

    const answers: RefineAnswer[] = questions
      .filter((q) => (selections[q.id] || []).length > 0)
      .map((q) => ({
        questionId: q.id,
        questionText: q.text,
        selected: selections[q.id],
      }));

    onSubmitAnswers(answers);
    setCurrentQuestionIndex(0);
    setSelections({});
  }, [isLastQuestion, questions, selections, onSubmitAnswers]);

  const handleSkipQuestion = useCallback(() => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex((i) => i + 1);
      return;
    }

    onSkip();
  }, [isLastQuestion, onSkip]);

  const currentSelections = currentQuestion
    ? selections[currentQuestion.id] || []
    : [];
  const hasSelection = currentSelections.length > 0;

  const toggleType = useCallback((value: ContentType) => {
    setTypeSelections((prev) => {
      if (value === "all") {
        return ["all"];
      }
      const withoutAll = prev.filter((t) => t !== "all");
      const hasValue = withoutAll.includes(value);
      if (hasValue) {
        const next = withoutAll.filter((t) => t !== value);
        return next.length === 0 ? ["all"] : next;
      }
      const next = [...withoutAll, value];
      return ENABLED_MEDIA_TYPES.every((t) => next.includes(t))
        ? ["all"]
        : next;
    });
  }, []);

  const handleTypeContinue = useCallback(() => {
    const type =
      typeSelections.length === 1 && typeSelections[0] === "all"
        ? "all"
        : typeSelections;
    onTypeSelected(type);
  }, [typeSelections, onTypeSelected]);

  const isTypeSelected = (value: ContentType) =>
    value === "all"
      ? typeSelections.includes("all")
      : typeSelections.includes(value);

  /* ─── Step 0a: Type selection (after query) ─────────────────────────── */
  if (showTypeSelect) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col px-6"
        style={{
          background:
            "linear-gradient(135deg, #020205 0%, #050508 50%, #08080c 100%)",
        }}
      >
        <AnimatedBackground />

        <div className="relative z-10 flex items-center justify-end py-5 px-2">
          <button
            onClick={() => {
              onTypeSelected("all");
            }}
            className="text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer"
          >
            Skip
          </button>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full text-center"
          >
            {initialQuery?.trim() && (
              <div className="mb-4 text-center">
                <ContextBar
                  initialQuery={initialQuery}
                  selectedType={
                    typeSelections.length === 1 && typeSelections[0] === "all"
                      ? "all"
                      : typeSelections
                  }
                />
              </div>
            )}
            <p className="text-sm text-purple-300/70 font-medium mb-3 uppercase tracking-wider">
              Narrow it down
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 leading-tight">
              What are you looking for?
            </h2>
            <p className="text-sm text-white/40 mb-8">Select all that apply</p>

            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {TYPE_OPTIONS.map((opt) => {
                const selected = isTypeSelected(opt.value);
                return (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleType(opt.value)}
                    className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-base font-medium transition-all duration-200 cursor-pointer border ${
                      selected
                        ? "bg-purple-500/30 text-purple-200 border-purple-500/50 shadow-lg shadow-purple-500/20"
                        : "bg-white/6 text-white/80 border-white/8 hover:bg-white/10 hover:border-white/15"
                    }`}
                  >
                    <span className="w-4 h-4 rounded border border-current flex items-center justify-center shrink-0">
                      {selected && (
                        <svg
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="w-3 h-3"
                        >
                          <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </span>
                    {opt.label}
                  </motion.button>
                );
              })}
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleTypeContinue}
              className="px-8 py-3.5 rounded-full font-semibold text-base bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:brightness-110 transition-all cursor-pointer"
            >
              Continue
            </motion.button>
          </motion.div>
        </div>

        <div className="relative z-10 pb-8 sm:pb-12" />
      </motion.div>
    );
  }

  /* ─── Step 0b: Mode selection (static, no AI call) ──────────────────── */
  if (showModeSelect) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col px-6"
        style={{
          background:
            "linear-gradient(135deg, #020205 0%, #050508 50%, #08080c 100%)",
        }}
      >
        <AnimatedBackground />

        {/* Skip in top-right */}
        <div className="relative z-10 flex items-center justify-end py-5 px-2">
          <button
            onClick={onSkip}
            className="text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer"
          >
            Skip
          </button>
        </div>

        {/* Mode cards — centered */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full text-center"
          >
            {(initialQuery?.trim() || selectedType) && (
              <div className="mb-4 text-center">
                <ContextBar initialQuery={initialQuery} selectedType={selectedType} />
              </div>
            )}
            <p className="text-sm text-purple-300/70 font-medium mb-3 uppercase tracking-wider">
              How do you want your results?
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-10 leading-tight">
              Pick your experience
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
              {/* List card */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => onModeSelected("list")}
                className="group liquid-glass p-6 rounded-2xl hover:border-purple-500/40 transition-all duration-300 cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-purple-300"
                    >
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">List</h3>
                </div>
                <p className="text-sm text-white/50 leading-relaxed">
                  A curated cravelist of recommendations. Great when you want
                  variety and options to choose from.
                </p>
                <div className="absolute bottom-4 right-5 text-white/20 group-hover:text-purple-400/60 transition-colors">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </motion.button>

              {/* Journey card */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => onModeSelected("journey")}
                className="group liquid-glass p-6 rounded-2xl hover:border-pink-500/40 transition-all duration-300 cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-pink-300"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                      <path d="M2 12h20" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">Journey</h3>
                </div>
                <p className="text-sm text-white/50 leading-relaxed">
                  A carefully curated path where every story leads to the next.
                  Start anywhere. End transformed.
                </p>
                <div className="absolute bottom-4 right-5 text-white/20 group-hover:text-pink-400/60 transition-colors">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Spacer */}
        <div className="relative z-10 pb-8 sm:pb-12" />
      </motion.div>
    );
  }

  /* ─── Loading state between AI rounds ──────────────────────────────── */
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
        style={{
          background:
            "linear-gradient(135deg, #020205 0%, #050508 50%, #08080c 100%)",
        }}
      >
        <AnimatedBackground />

        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          {(initialQuery?.trim() || selectedType || selectedMode || (previousAnswers && previousAnswers.length > 0)) && (
            <div className="mb-6">
              <ContextBar
                initialQuery={initialQuery}
                selectedType={selectedType}
                selectedMode={selectedMode}
                previousAnswers={previousAnswers}
              />
            </div>
          )}
          <motion.div
            className="w-10 h-10 mx-auto mb-6 border-2 border-white/20 border-t-purple-400 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-lg text-white/70 font-medium">
            {round <= 1
              ? "Analyzing your taste..."
              : "Digging deeper into your preferences..."}
          </p>
        </div>
      </motion.div>
    );
  }

  /* ─── AI-generated questions ───────────────────────────────────────── */
  if (!currentQuestion) return null;

  // Total progress dots = all questions across all visible rounds
  const progressDotCount = totalQuestions;

  // Answers from current round (questions already answered before this one)
  const currentRoundAnswersSoFar: RefineAnswer[] = questions
    .slice(0, currentQuestionIndex)
    .filter((q) => (selections[q.id] || []).length > 0)
    .map((q) => ({
      questionId: q.id,
      questionText: q.text,
      selected: selections[q.id] || [],
    }));
  const allAnswersForDisplay = [
    ...(previousAnswers || []),
    ...currentRoundAnswersSoFar,
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col px-6"
      style={{
        background:
          "linear-gradient(135deg, #020205 0%, #050508 50%, #08080c 100%)",
      }}
    >
      <AnimatedBackground />

      {/* Question content — vertically centered */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-4">
        {(initialQuery?.trim() || selectedType || selectedMode || allAnswersForDisplay.length > 0) && (
          <div className="mb-6 text-center">
            <ContextBar
              initialQuery={initialQuery}
              selectedType={selectedType}
              selectedMode={selectedMode}
              previousAnswers={allAnswersForDisplay}
            />
          </div>
        )}
        {/* Progress Dots - Top Centered */}
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: progressDotCount }).map((_, i) => {
            let dotClass = "bg-white/20";
            if (i === currentQuestionIndex)
              dotClass = "bg-purple-400 scale-125";
            else if (i < currentQuestionIndex) dotClass = "bg-purple-400/50";
            return (
              <div
                key={`dot-${i}`}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${dotClass}`}
              />
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${round}-${currentQuestionIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full text-center"
          >
            <p className="text-sm text-purple-300/70 font-medium mb-3 uppercase tracking-wider">
              {round <= 1 ? "Let\u2019s refine your taste" : "Almost there"}
            </p>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 leading-tight">
              {currentQuestion.text}
            </h2>

            <p className="text-sm text-white/40 mb-8">
              {currentQuestion.multiSelect
                ? "Select all that apply"
                : "Choose one"}
            </p>

            {/* Options — pills */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {currentQuestion.options.map((option) => {
                const isSelected = currentSelections.includes(option);
                return (
                  <motion.button
                    key={option}
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      toggleOption(
                        currentQuestion.id,
                        option,
                        currentQuestion.multiSelect,
                      )
                    }
                    className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-base font-medium transition-all duration-200 cursor-pointer border ${
                      isSelected
                        ? "bg-purple-500/30 text-purple-200 border-purple-500/50 shadow-lg shadow-purple-500/20"
                        : "bg-white/6 text-white/80 border-white/8 hover:bg-white/10 hover:border-white/15"
                    }`}
                  >
                    {currentQuestion.multiSelect && (
                      <span className="w-4 h-4 rounded border border-current flex items-center justify-center shrink-0">
                        {isSelected && (
                          <svg
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            className="w-3 h-3 text-purple-300"
                          >
                            <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
                          </svg>
                        )}
                      </span>
                    )}
                    {option}
                  </motion.button>
                );
              })}
            </div>

            {/* Actions: Continue & Skip */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleContinue}
                disabled={!hasSelection}
                className={`order-1 sm:order-2 px-8 py-3.5 rounded-full font-semibold text-base transition-all duration-300 cursor-pointer ${
                  hasSelection
                    ? "bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:brightness-110"
                    : "bg-white/6 text-white/30 cursor-not-allowed"
                }`}
              >
                {isLastQuestion ? "Get Recommendations" : "Continue"}
              </motion.button>

              <button
                onClick={handleSkipQuestion}
                className="order-2 sm:order-1 text-sm text-white/30 hover:text-white/60 transition-colors cursor-pointer px-4 py-2"
              >
                Skip
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Spacer to balance vertical alignment */}
      <div className="h-12" />
    </motion.div>
  );
}
