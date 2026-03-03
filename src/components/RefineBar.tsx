"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RefineBarProps {
  onRefine: (feedback: string) => void;
  onRefresh?: () => void;
  isLoading: boolean;
}

export default function RefineBar({
  onRefine,
  onRefresh,
  isLoading,
}: RefineBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const text = feedback.trim();
    if (!text || isLoading) return;
    onRefine(text);
    setFeedback("");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setIsOpen(false);
      setFeedback("");
    }
  };

  return (
    <div className="mt-4">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <div
            key="trigger"
            className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm text-white/50"
          >
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(true)}
              className="group inline-flex items-center gap-2 hover:text-purple-300 transition-colors cursor-pointer"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform group-hover:rotate-45"
              >
                <path d="M12 20h9" />
                <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.855z" />
              </svg>
              Not what you expected? Refine it
            </motion.button>
            {onRefresh && (
              <>
                <span className="text-white/30">or</span>
                <button
                  onClick={() => !isLoading && onRefresh()}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 hover:text-purple-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={isLoading ? "animate-spin" : ""}
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 21h5v-5" />
                  </svg>
                  Refresh
                </button>
              </>
            )}
          </div>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="liquid-glass rounded-xl overflow-visible"
          >
            <div className="p-3 sm:p-4">
              <p className="text-xs text-white/40 mb-2 font-medium uppercase tracking-wider">
                What would you change?
              </p>
              <textarea
                ref={inputRef}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. More comedy, less horror · Something from the 90s · Shorter movies only"
                rows={2}
                className="w-full bg-transparent text-sm text-white placeholder:text-white/25 outline-none resize-none"
                disabled={isLoading}
              />
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setFeedback("");
                  }}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!feedback.trim() || isLoading}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-medium hover:bg-purple-500/30 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Refining…" : "Refine"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
