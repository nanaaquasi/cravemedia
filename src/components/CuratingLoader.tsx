"use client";

import { useState, useEffect, useMemo } from "react";
import type { ContentType } from "@/lib/types";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const JOURNEY_MESSAGES = [
  "Plotting your path through the cosmos...",
  "Mapping the route from start to finish...",
  "Weaving your story, one step at a time...",
  "Sit back—we're crafting your adventure...",
  "Connecting the dots for your perfect journey...",
  "Designing the sequence of your dreams...",
  "Charting your course through the stars...",
  "Building the roadmap to your next obsession...",
];

const MEDIA_SPECIFIC_MESSAGES = {
  movie: [
    "Dimming the lights for your private screening...",
    "Scanning the archives for a cinematic masterpiece...",
    "Casting the leads for your next favorite film...",
    "Reviewing the dailies to find the perfect pick...",
    "Wait for it... the opening credits are starting...",
    "Sifting through the reels for a hidden gem...",
    "Adjusting the lens for your next big adventure...",
    "Scouting locations for a story you'll love...",
  ],
  tv: [
    "Cueing up your next great binge-watch...",
    "Synchronizing with the latest season's best...",
    "Checking the schedule for your next obsession...",
    "Buffering the best plot twists just for you...",
    "Setting the stage for a marathon-worthy series...",
    "Scanning the airwaves for your perfect signal...",
    "Drafting the pilot for your new favorite show...",
    "Ensuring the cliffhanger is worth the wait...",
  ],
  book: [
    "Cracking the spine on a new journey...",
    "Leafing through the shelves for a page-turner...",
    "Dusting off the classics and the bestsellers...",
    "Finding the perfect chapter to get lost in...",
    "Scouring the library for your next great read...",
    "Inking the pages of your upcoming adventure...",
    "Bookmark found. Fetching your next story...",
    "Translating your mood into a literary escape...",
  ],
  anime: [
    "Powering up the search to over 9000...",
    "Syncing the subtitles for your next watch...",
    "Sketching the frames of a new world...",
    "Opening the portal to your next isekai...",
    "Calibrating the spirit energy for your picks...",
    "Scanning the multiverse for top-tier animation...",
    "Choosing a story with a legendary soundtrack...",
    "Rendering the masterpiece you’ve been waiting for...",
  ],
};

type MediaTypeKey = keyof typeof MEDIA_SPECIFIC_MESSAGES;

interface CuratingLoaderProps {
  mode?: "list" | "journey";
  mediaType?: ContentType | ContentType[];
}

function randomIndex(length: number, exclude?: number): number {
  if (length <= 1) return 0;
  let idx = Math.floor(Math.random() * length);
  if (exclude !== undefined && idx === exclude) {
    idx = (idx + 1) % length;
  }
  return idx;
}

function getMessagesForMediaType(mediaType: ContentType | ContentType[] | undefined): string[] {
  if (!mediaType || mediaType === "all") {
    return (Object.values(MEDIA_SPECIFIC_MESSAGES) as string[][]).flat();
  }
  const keys = Array.isArray(mediaType) ? mediaType : [mediaType];
  if (keys.includes("all")) {
    return (Object.values(MEDIA_SPECIFIC_MESSAGES) as string[][]).flat();
  }
  const merged = keys.flatMap((k) =>
    MEDIA_SPECIFIC_MESSAGES[k as MediaTypeKey] ?? []
  );
  return merged.length > 0 ? merged : getMessagesForMediaType("all");
}

export default function CuratingLoader({
  mode = "list",
  mediaType = "all",
}: CuratingLoaderProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const messages = useMemo(
    () =>
      mode === "journey"
        ? JOURNEY_MESSAGES
        : getMessagesForMediaType(mediaType),
    [mode, mediaType]
  );
  const [index, setIndex] = useState(() => randomIndex(messages.length));

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => randomIndex(messages.length, i));
    }, 2800);
    return () => clearInterval(id);
  }, [messages.length]);

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
          className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/70 animate-curate-text-fade drop-shadow-lg"
        >
          {messages[Math.min(index, messages.length - 1)]}
        </p>
      </div>
    </motion.div>
  );
}
