"use client";

import { WifiOff, RefreshCw, Bookmark } from "lucide-react";

export default function OfflineContent() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Animated icon */}
        <div className="relative mx-auto mb-8 w-24 h-24">
          {/* Outer pulse ring */}
          <div className="absolute inset-0 rounded-full bg-linear-to-br from-purple-500/20 to-pink-500/20 animate-pwa-pulse" />
          {/* Inner glass circle */}
          <div className="absolute inset-2 rounded-full liquid-glass flex items-center justify-center">
            <WifiOff className="w-10 h-10 text-(--text-secondary) animate-pwa-float" />
          </div>
        </div>

        {/* Main card */}
        <div className="liquid-glass rounded-xl p-8 mb-6">
          <h1 className="text-2xl font-bold text-(--text-primary) mb-3">
            You&apos;re offline
          </h1>
          <p className="text-(--text-secondary) text-base leading-relaxed mb-6">
            It looks like you&apos;ve lost your internet connection. Check your
            network and try again.
          </p>

          {/* Retry button */}
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white transition-all duration-300 hover:scale-105 active:scale-95"
            style={{ background: "var(--accent-gradient)" }}
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>

        {/* Reassurance */}
        <div className="flex items-center justify-center gap-2 text-(--text-muted) text-sm">
          <Bookmark className="w-4 h-4" />
          <span>Your saved collections are still waiting for you</span>
        </div>
      </div>
    </div>
  );
}
