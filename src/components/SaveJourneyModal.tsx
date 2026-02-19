"use client";

import { useState } from "react";
import Modal from "./Modal";

interface SaveJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    title: string;
    goalAmount?: number;
    goalUnit?: string;
  }) => void;

  defaultTitle: string;
}

export default function SaveJourneyModal({
  isOpen,
  onClose,
  onConfirm,
  defaultTitle,
}: SaveJourneyModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [hasGoal, setHasGoal] = useState(false);
  const [duration, setDuration] = useState("");
  const [durationUnit, setDurationUnit] = useState("weeks");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      title,
      goalAmount: hasGoal && duration ? parseInt(duration) : undefined,
      goalUnit: hasGoal ? durationUnit : undefined,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent mb-1">
            Save Journey
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            A permanent place for this path.
          </p>
        </div>

        {/* Title Input */}
        <div className="space-y-2">
          <label
            htmlFor="journey-title"
            className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider"
          >
            Journey Title
          </label>
          <input
            id="journey-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-colors text-white"
            placeholder="e.g. My Sci-Fi Odyssey"
            autoFocus
          />
        </div>

        {/* Goal Checkbox */}
        <div className="p-4 bg-white/[0.03] rounded-xl border border-white/5">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`w-5 h-5 rounded border border-white/20 flex items-center justify-center transition-colors ${
                hasGoal
                  ? "bg-purple-500 border-purple-500"
                  : "group-hover:border-white/40"
              }`}
            >
              <input
                type="checkbox"
                className="hidden"
                checked={hasGoal}
                onChange={(e) => setHasGoal(e.target.checked)}
              />
              {hasGoal && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white"
                >
                  <polyline points="2 6 4.5 9 10 3" />
                </svg>
              )}
            </div>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Set a goal for this journey?
            </span>
          </label>

          {/* Goal inputs */}
          {hasGoal && (
            <div className="mt-4 pl-8 grid grid-cols-2 gap-3 animate-fade-in-up">
              <input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Length"
                className="px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-white focus:border-purple-500/50 focus:outline-none"
              />
              <div className="relative">
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-white appearance-none focus:border-purple-500/50 focus:outline-none cursor-pointer"
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:brightness-110 transition-all cursor-pointer"
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
