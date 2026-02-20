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
  selected: ContentType | ContentType[];
  onChange: (type: ContentType | ContentType[]) => void;
}

export default function ContentTypeSelector({
  selected,
  onChange,
}: ContentTypeSelectorProps) {
  const selectedArray = Array.isArray(selected) ? selected : [selected];
  const isAllSelected = selectedArray.includes("all");

  const handleToggle = (type: ContentType) => {
    if (type === "all") {
      onChange("all");
      return;
    }

    let newSelected: ContentType[];

    if (isAllSelected) {
      // If "All" was selected and we click a specific type, switch to just that type
      newSelected = [type];
    } else if (selectedArray.includes(type)) {
      // Toggle off
      newSelected = selectedArray.filter((t) => t !== type);
      // If nothing left, default back to "all"
      if (newSelected.length === 0) {
        newSelected = ["all"];
      }
    } else {
      // Toggle on
      newSelected = [...selectedArray, type];

      // If all specific types are now selected, just set to "all"
      const allSpecificSelected = ENABLED_MEDIA_TYPES.every((t) =>
        newSelected.includes(t as ContentType),
      );
      if (allSpecificSelected) {
        newSelected = ["all"];
      }
    }

    // If it's a single item "all", just pass the string for backward compatibility/simplicity
    if (newSelected.length === 1 && newSelected[0] === "all") {
      onChange("all");
    } else {
      onChange(newSelected);
    }
  };

  return (
    <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-2 overflow-x-visible md:overflow-x-auto pb-1 scrollbar-hide">
      {types.map((type) => {
        const isActive =
          type.value === "all"
            ? isAllSelected
            : selectedArray.includes(type.value);

        return (
          <button
            key={type.value}
            onClick={() => handleToggle(type.value)}
            className={`
              flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium flex-shrink-0
              transition-all duration-200 cursor-pointer whitespace-nowrap
              ${
                isActive
                  ? "bg-white/12 text-white border border-white/15 shadow-[0_0_16px_rgba(168,85,247,0.15)]"
                  : "bg-white/[0.05] text-white/60 border border-white/[0.04] hover:bg-white/[0.08] hover:text-white/90"
              }
            `}
            aria-pressed={isActive}
          >
            <span className="text-base md:text-lg leading-none">
              {type.icon}
            </span>
            {type.label}
          </button>
        );
      })}
    </div>
  );
}
