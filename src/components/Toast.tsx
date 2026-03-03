"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string | null;
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  onClose,
  duration = 2500,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      let innerTimerId: ReturnType<typeof setTimeout>;
      const timer = setTimeout(() => {
        setIsVisible(false);
        innerTimerId = setTimeout(onClose, 300);
      }, duration);
      return () => {
        clearTimeout(timer);
        clearTimeout(innerTimerId!);
      };
    }
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div
      className={`fixed z-50 left-1/2 -translate-x-1/2 bottom-32 sm:bottom-24 w-auto max-w-[90vw] transition-all duration-300 transform ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500/20 text-green-400">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <span className="text-sm font-medium text-white/90 truncate max-w-xs sm:max-w-sm">
          {message}
        </span>
      </div>
    </div>
  );
}
