"use client";

import { useState } from "react";
import { CollectionItem } from "@/lib/supabase/types";
import { Play, BookOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface InProgressMediaProps {
  items: CollectionItem[];
}

export function InProgressMedia({ items }: InProgressMediaProps) {
  const [filter, setFilter] = useState<"watching" | "reading">("watching");

  const watchingItems = items.filter((i) => i.media_type !== "book");
  const readingItems = items.filter((i) => i.media_type === "book");

  const displayed =
    filter === "watching"
      ? watchingItems.slice(0, 4)
      : readingItems.slice(0, 4);

  if (watchingItems.length === 0 && readingItems.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Play className="w-5 h-5 text-blue-400" />
          In Progress
        </h2>
        <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10">
          <button
            onClick={() => setFilter("watching")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              filter === "watching"
                ? "bg-white/15 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Play className="w-3 h-3" />
            Watching
            {watchingItems.length > 0 && (
              <span className="ml-0.5 text-[10px] opacity-60">
                {watchingItems.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter("reading")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              filter === "reading"
                ? "bg-white/15 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-3 h-3" />
            Reading
            {readingItems.length > 0 && (
              <span className="ml-0.5 text-[10px] opacity-60">
                {readingItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {displayed.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {displayed.map((item) => (
            <InProgressCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-zinc-500 text-sm py-6 text-center">
          {filter === "watching"
            ? "No movies or shows in progress"
            : "No books in progress"}
        </p>
      )}
    </div>
  );
}

function InProgressCard({ item }: { item: CollectionItem }) {
  const meta = item.metadata as { posterUrl?: string; type?: string } | null;
  const posterUrl = item.image_url || meta?.posterUrl;
  const title = item.title || "Untitled";

  return (
    <Link
      href={`/collections/${item.collection_id}`}
      className="group block shrink-0 w-28 sm:w-32"
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="128px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-blue-900/30 to-purple-900/30">
            {item.media_type === "book" ? "📚" : "🎬"}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <span className="inline-block px-1 py-0.5 rounded bg-blue-500/30 text-blue-300 text-[8px] font-semibold uppercase tracking-wider mb-0.5">
            {item.media_type === "book" ? "Reading" : "Watching"}
          </span>
          <h4 className="text-[11px] font-semibold text-white leading-tight line-clamp-2">
            {title}
          </h4>
        </div>
      </div>
    </Link>
  );
}
