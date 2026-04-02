"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorksModal({
  isOpen,
  onClose,
}: HowItWorksModalProps) {
  // TODO: Paste your YouTube video ID here (the 11 random characters in the YouTube URL)
  // For example, if your video is https://youtu.be/dQw4w9WgXcQ, the ID is dQw4w9WgXcQ
  const YOUTUBE_VIDEO_ID = "R3LMyjtdzA0";

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex justify-center items-center overflow-hidden p-4 md:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative flex flex-col w-full max-w-5xl bg-zinc-950 border border-white/10 rounded-2xl md:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10">
          <button
            onClick={onClose}
            className="p-2 bg-black/50 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors backdrop-blur-md border border-white/10"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Wrapper */}
        <div className="w-full aspect-video bg-black flex items-center justify-center relative">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
            title="Craveo: How it works"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
