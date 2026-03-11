"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";

export type FavoriteTargetType =
  | "movie"
  | "tv"
  | "anime"
  | "book"
  | "collection"
  | "journey"
  | "person";

interface FavoriteButtonProps {
  targetType: FavoriteTargetType;
  targetId: string;
  title?: string | null;
  imageUrl?: string | null;
  metadata?: Record<string, unknown>;
  className?: string;
  size?: "sm" | "md";
}

export function FavoriteButton({
  targetType,
  targetId,
  title,
  imageUrl,
  metadata = {},
  className = "",
  size = "md",
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(
          `/api/favorites/check?target_type=${encodeURIComponent(targetType)}&target_id=${encodeURIComponent(targetId)}`,
        );
        if (cancelled) return;
        const data = await res.json();
        setIsFavorited(data.isFavorited ?? false);
      } catch {
        if (!cancelled) setIsFavorited(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [targetType, targetId]);

  const handleClick = async () => {
    if (isLoading || isToggling) return;

    const prev = isFavorited;
    setIsFavorited(!prev);
    setIsToggling(true);

    try {
      if (prev) {
        const res = await fetch(
          `/api/favorites?target_type=${encodeURIComponent(targetType)}&target_id=${encodeURIComponent(targetId)}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to remove favorite");
        }
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_type: targetType,
            target_id: targetId,
            title: title ?? undefined,
            image_url: imageUrl ?? undefined,
            metadata,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to add favorite");
        }
      }
    } catch {
      setIsFavorited(prev);
    } finally {
      setIsToggling(false);
    }
  };

  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const buttonSize = size === "sm" ? "p-2" : "p-2.5";

  if (isLoading) {
    return (
      <button
        disabled
        className={`inline-flex items-center justify-center rounded-xl bg-white/[0.06] border border-white/10 text-[var(--text-muted)] cursor-not-allowed ${buttonSize} ${className}`}
        aria-label="Favorite"
      >
        <Heart className={`${iconSize} animate-pulse`} />
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={isToggling}
      className={`inline-flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${buttonSize} ${
        isFavorited
          ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border-rose-500/30"
          : "bg-white/[0.06] hover:bg-white/[0.1] text-[var(--text-secondary)] hover:text-white border-white/10"
      } ${className}`}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        animate={{ scale: isFavorited ? 1 : 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <Heart
          className={`${iconSize} ${isFavorited ? "fill-current" : ""}`}
        />
      </motion.div>
    </motion.button>
  );
}
