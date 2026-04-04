"use client";

import { useMemo, useEffect } from "react";
import type { ContentType } from "@/lib/types";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  JOURNEY_CURATING_MESSAGES,
  getCuratingMessagesForMediaType,
} from "@/config/curating-loader-messages";
import { useRotatingCuratingMessage } from "@/hooks/useRotatingCuratingMessage";

interface CuratingLoaderProps {
  mode?: "list" | "journey";
  mediaType?: ContentType | ContentType[];
}

export default function CuratingLoader({
  mode = "list",
  mediaType = "all",
}: CuratingLoaderProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const messages = useMemo(
    () =>
      mode === "journey"
        ? JOURNEY_CURATING_MESSAGES
        : getCuratingMessagesForMediaType(mediaType),
    [mode, mediaType],
  );
  const { message, index } = useRotatingCuratingMessage(messages, {
    active: true,
  });

  // Lock body scroll when loader is active
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4 overflow-hidden overscroll-none touch-none"
      style={{
        background:
          "linear-gradient(135deg, #020205 0%, #050508 50%, #08080c 100%)",
      }}
    >
      {/* Gradient blobs — static when prefers-reduced-motion, animated otherwise */}
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute inset-0">
          {prefersReducedMotion ? (
            <>
              <div
                className="absolute top-[25%] left-[25%] rounded-full w-[400px] h-[400px] -translate-x-1/2 -translate-y-1/2 blur-[60px]"
                style={{
                  background:
                    "radial-gradient(circle, rgba(88,28,135,0.5) 0%, transparent 70%)",
                }}
              />
              <div
                className="absolute top-[35%] left-[55%] rounded-full w-[400px] h-[400px] -translate-x-1/2 -translate-y-1/2 blur-[60px]"
                style={{
                  background:
                    "radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)",
                }}
              />
              <div
                className="absolute top-[55%] left-[35%] rounded-full w-[400px] h-[400px] -translate-x-1/2 -translate-y-1/2 blur-[60px]"
                style={{
                  background:
                    "radial-gradient(circle, rgba(190,24,93,0.4) 0%, transparent 70%)",
                }}
              />
            </>
          ) : (
            <>
              <motion.div
                className="absolute top-[25%] left-[25%] rounded-full blur-[120px] w-[400px] h-[400px] -translate-x-1/2 -translate-y-1/2"
                style={{
                  background:
                    "radial-gradient(circle, rgba(88,28,135,0.65) 0%, transparent 70%)",
                }}
                animate={{
                  x: [0, 120, -80, 0],
                  y: [0, -90, 100, 0],
                  scale: [1, 1.25, 0.9, 1],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute top-[35%] left-[55%] rounded-full blur-[120px] w-[400px] h-[400px] -translate-x-1/2 -translate-y-1/2"
                style={{
                  background:
                    "radial-gradient(circle, rgba(124,58,237,0.55) 0%, transparent 70%)",
                }}
                animate={{
                  x: [0, -100, 90, 0],
                  y: [0, 80, -70, 0],
                  scale: [1, 0.9, 1.2, 1],
                }}
                transition={{
                  duration: 7,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
              />
              <motion.div
                className="absolute top-[55%] left-[35%] rounded-full blur-[120px] w-[400px] h-[400px] -translate-x-1/2 -translate-y-1/2"
                style={{
                  background:
                    "radial-gradient(circle, rgba(190,24,93,0.55) 0%, transparent 70%)",
                }}
                animate={{
                  x: [0, 80, -110, 0],
                  y: [0, -80, 90, 0],
                  scale: [1, 1.15, 0.88, 1],
                }}
                transition={{
                  duration: 5.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
              />
              <motion.div
                className="absolute top-[50%] left-[50%] rounded-full blur-[120px] w-[380px] h-[380px] -translate-x-1/2 -translate-y-1/2"
                style={{
                  background:
                    "radial-gradient(circle, rgba(136,19,55,0.55) 0%, transparent 70%)",
                }}
                animate={{
                  x: [0, -90, 70, 0],
                  y: [0, 70, -90, 0],
                  scale: [1, 1.1, 0.92, 1],
                }}
                transition={{
                  duration: 6.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.25,
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Glass overlay — lighter blur when reduced motion */}
      <div
        className={`absolute inset-0 bg-black/20 ${prefersReducedMotion ? "backdrop-blur-[20px]" : "backdrop-blur-[60px]"}`}
        aria-hidden
      />

      {/* Content */}
      <div className="relative z-10 text-center">
        <p
          key={index}
          className="text-2xl sm:text-3xl font-bold md:font-extrabold text-transparent bg-clip-text bg-linear-to-r from-white via-white/90 to-white/70 animate-curate-text-fade drop-shadow-lg"
        >
          {message}
        </p>
      </div>
    </motion.div>
  );
}
