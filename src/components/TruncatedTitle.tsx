"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";

interface TruncatedTitleProps {
  title: string;
  className?: string;
}

/**
 * Renders truncated text with a hover popover showing the full title.
 * Uses a portal so the popover is not clipped by overflow:hidden parents.
 */
export default function TruncatedTitle({
  title,
  className = "",
}: TruncatedTitleProps) {
  const [popover, setPopover] = useState<{
    show: boolean;
    top: number;
    left: number;
  }>({ show: false, top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  const handleEnter = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      setPopover({ show: true, top: rect.top, left: rect.left });
    }
  };

  const handleLeave = () => {
    setPopover((p) => ({ ...p, show: false }));
  };

  return (
    <>
      <span
        ref={ref}
        className={`block truncate ${className}`}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {title}
      </span>
      {popover.show &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            className="fixed z-[9999] max-w-[280px] px-3 py-2 rounded-lg bg-zinc-800 text-white text-sm font-medium shadow-xl border border-white/10 whitespace-normal break-words pointer-events-none"
            role="tooltip"
            style={{
              top: popover.top - 8,
              left: popover.left,
              transform: "translateY(-100%)",
            }}
          >
            {title}
          </span>,
          document.body,
        )}
    </>
  );
}
