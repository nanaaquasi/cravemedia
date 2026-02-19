"use client";

import { Collection, CollectionItem } from "@/lib/supabase/types";
import { EnrichedRecommendation } from "@/lib/types";
import RecommendationItem from "@/components/RecommendationItem";
import { ArrowLeft, Share2, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface CollectionDetailClientProps {
  collection: Collection;
  items: CollectionItem[];
}

export default function CollectionDetailClient({
  collection,
  items,
}: CollectionDetailClientProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(globalThis.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header / Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
        >
          <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">Back to Profile</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all cursor-pointer border ${
              isCopied
                ? "bg-green-500/20 border-green-500/50 text-green-400"
                : "bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
            title="Share collection"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-xs font-semibold">
              {isCopied ? "Copied!" : "Share"}
            </span>
          </button>
          <button
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer border border-white/5"
            title="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collection Info */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold tracking-wider uppercase border border-purple-500/20">
            Collection
          </span>
          <span className="text-zinc-500 text-xs font-medium">
            {items.length} titles
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
          {collection.name}
        </h1>
        {collection.description && (
          <p className="text-zinc-400 text-lg max-w-2xl leading-relaxed">
            {collection.description}
          </p>
        )}
      </div>

      {/* Items Grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {items.map((dbItem, index) => {
            const item = dbItem.metadata as unknown as EnrichedRecommendation;
            return (
              <RecommendationItem key={dbItem.id} item={item} index={index} />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center rounded-3xl bg-zinc-900/30 border border-white/5">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-3xl mb-6">
            📋
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            This collection is empty
          </h2>
          <p className="text-zinc-500 text-sm max-w-xs">
            Start exploring and add your favorite movies, TV shows, and books to
            this collection.
          </p>
          <Link
            href="/"
            className="mt-8 px-6 py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors"
          >
            Discover Media
          </Link>
        </div>
      )}
    </div>
  );
}
