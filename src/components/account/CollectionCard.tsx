import { Collection } from "@/lib/supabase/types";
import Image from "next/image";

import Link from "next/link";

interface CollectionCardProps {
  collection: Collection & {
    items?: { image_url: string | null }[];
    item_count?: number;
  };
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const images =
    collection.items
      ?.map((i) => i.image_url)
      .filter(Boolean)
      .slice(0, 3) || [];
  const itemCount = collection.item_count || collection.items?.length || 0;

  // Mock "days ago" logic for now, or use real created_at if available
  const timeAgo = "20 days";

  return (
    <Link href={`/collections/${collection.id}`} className="block">
      <div className="group relative bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-3xl p-4 hover:bg-zinc-800/50 transition-all cursor-pointer overflow-hidden h-full">
        {/* Liquid Glass / Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Image Strip Container */}
        <div className="flex h-48 gap-2 mb-4 rounded-2xl overflow-hidden relative">
          {images.length > 0 ? (
            images.map((img, idx) => (
              <div
                key={idx}
                className={`relative h-full ${
                  images.length === 1
                    ? "w-full"
                    : images.length === 2
                      ? "w-1/2"
                      : "w-1/3"
                }`}
              >
                <Image
                  src={img!}
                  alt={`Item ${idx + 1}`}
                  fill
                  className="object-cover"
                />
                {/* Darken overlay for strips to make text readable if needed, or just style */}
                <div className="absolute inset-0 bg-black/20" />
              </div>
            ))
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600">
              <span className="text-xs">No items</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex justify-between items-end">
          <div>
            <h3 className="text-lg font-bold text-white leading-tight mb-1 group-hover:text-purple-400 transition-colors">
              {collection.name}
            </h3>
            <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">
              A collection of my favourite {collection.name.toLowerCase()} items
            </p>
          </div>
        </div>

        {/* Footer Tags */}
        <div className="flex gap-2 mt-4">
          <span className="px-3 py-1 rounded-lg bg-black/40 text-xs font-medium text-zinc-400 border border-white/5">
            {itemCount} titles
          </span>
          <span className="px-3 py-1 rounded-lg bg-black/40 text-xs font-medium text-zinc-400 border border-white/5">
            {timeAgo}
          </span>
        </div>
      </div>
    </Link>
  );
}
