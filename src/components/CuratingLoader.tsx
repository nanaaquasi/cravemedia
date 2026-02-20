"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

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

const LIST_MESSAGES = [
  "Scanning the universe for your perfect matches...",
  "Finding the hidden gems...",
  "Curating your personal collection...",
  "Mining the depths for what you'll love...",
  "Assembling your dream lineup...",
  "Sifting through the archives for you...",
  "Discovering the perfect picks for your mood...",
  "Handpicking treasures just for you...",
];

interface CuratingLoaderProps {
  mode?: "list" | "journey";
}

export default function CuratingLoader({ mode = "list" }: CuratingLoaderProps) {
  const messages = mode === "journey" ? JOURNEY_MESSAGES : LIST_MESSAGES;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
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
      {/* Animated gradient blobs - Framer Motion mesh, centered */}
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute inset-0">
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
        </div>
      </div>

      {/* Glass overlay */}
      <div
        className="absolute inset-0 backdrop-blur-[60px] bg-black/20"
        aria-hidden
      />

      {/* Content */}
      <div className="relative z-10 text-center">
        <p
          key={index}
          className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/70 animate-curate-text-fade drop-shadow-lg"
        >
          {messages[index]}
        </p>
      </div>
    </motion.div>
  );
}
