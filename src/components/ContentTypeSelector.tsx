"use client";

import { ContentType } from "@/lib/types";
import { ENABLED_MEDIA_TYPES } from "@/config/media-types";

const TYPE_OPTIONS: Record<
  "movie" | "tv" | "book" | "anime",
  { label: string; icon: string }
> = {
  movie: { label: "Movies", icon: "🎬" },
  tv: { label: "TV Shows", icon: "📺" },
  book: { label: "Books", icon: "📚" },
  anime: { label: "Anime", icon: "🎌" },
};

const types = [
  { value: "all" as ContentType, label: "All", icon: "✦" },
  ...ENABLED_MEDIA_TYPES.map((value) => ({
    value: value as ContentType,
    label: TYPE_OPTIONS[value].label,
    icon: TYPE_OPTIONS[value].icon,
  })),
];

interface ContentTypeSelectorProps {
  selected: ContentType;
  onChange: (type: ContentType) => void;
}

export default function ContentTypeSelector({
  selected,
  onChange,
}: ContentTypeSelectorProps) {
  return (
    <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-2 overflow-x-visible md:overflow-x-auto pb-1 scrollbar-hide">
      {types.map((type) => (
        <button
          key={type.value}
          onClick={() => onChange(type.value)}
          className={`
            flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium flex-shrink-0
            transition-all duration-200 cursor-pointer whitespace-nowrap
            ${
              selected === type.value
                ? "bg-white/12 text-white border border-white/15 shadow-[0_0_16px_rgba(168,85,247,0.15)]"
                : "bg-white/[0.05] text-white/60 border border-white/[0.04] hover:bg-white/[0.08] hover:text-white/90"
            }
          `}
          aria-pressed={selected === type.value}
        >
          <span className="text-base md:text-lg leading-none">{type.icon}</span>
          {type.label}
        </button>
      ))}
    </div>
  );
}
