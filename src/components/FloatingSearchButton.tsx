"use client";

interface FloatingSearchButtonProps {
  onClick: () => void;
  isLoading?: boolean;
}

export default function FloatingSearchButton({
  onClick,
  isLoading = false,
}: FloatingSearchButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="hidden fixed bottom-[max(2rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 w-16 h-16 rounded-2xl flex items-center justify-center cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 active:scale-95 group shadow-xl"
      aria-label="Search for recommendations"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600" />
      {/* Shine overlay */}
      <div
        className="absolute inset-0 rounded-2xl opacity-30"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 45%, rgba(255,255,255,0.08) 100%)",
        }}
      />
      {/* Glow shadow */}
      <div className="absolute inset-0 rounded-2xl shadow-[0_0_32px_rgba(168,85,247,0.4),0_0_64px_rgba(236,72,153,0.15)] group-hover:shadow-[0_0_40px_rgba(168,85,247,0.5),0_0_80px_rgba(236,72,153,0.2)] transition-shadow" />
      <div className="absolute inset-0 rounded-2xl border border-white/25 group-hover:border-white/40 transition-colors" />
      {/* Icon */}
      <span className="relative z-10 text-2xl text-white drop-shadow-md">
        {isLoading ? (
          <div className="w-7 h-7 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          "✦"
        )}
      </span>
    </button>
  );
}
