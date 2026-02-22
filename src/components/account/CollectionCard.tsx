import { Collection } from "@/lib/supabase/types";
import Image from "next/image";

import Link from "next/link";

const FEATURED_CARD_GRADIENTS = [
  "radial-gradient(ellipse 80% 70% at 30% 70%, #3d2a1a 0%, #2c1f14 40%, #1a1510 100%)",
  "radial-gradient(ellipse 80% 70% at 70% 30%, #2b2a48 0%, #1e1d35 40%, #151420 100%)",
  "radial-gradient(ellipse 80% 70% at 50% 50%, #2b2b48 0%, #1e1e35 40%, #151520 100%)",
  "radial-gradient(ellipse 80% 70% at 70% 60%, #3d2a35 0%, #2a1e25 40%, #1a1418 100%)",
  "radial-gradient(ellipse 80% 70% at 30% 30%, #2b3b48 0%, #1e2a35 40%, #151a20 100%)",
  "radial-gradient(ellipse 80% 70% at 50% 80%, #1a2a22 0%, #151f1a 40%, #0f1814 100%)",
  "radial-gradient(ellipse 80% 70% at 60% 70%, #2a2520 0%, #1f1b18 40%, #151210 100%)",
  "radial-gradient(ellipse 80% 70% at 30% 50%, #3d2e1a 0%, #2a2215 40%, #1a1610 100%)",
];

interface CollectionCardProps {
  collection: Collection & {
    items?: { image_url: string | null }[];
    item_count?: number;
    curator_first_name?: string | null;
  };
  variant?: "default" | "featured";
  gradientIndex?: number;
}

export function CollectionCard({
  collection,
  variant = "default",
  gradientIndex = 0,
}: CollectionCardProps) {
  const maxImages = variant === "featured" ? 6 : 3;
  const images =
    collection.items
      ?.map((i) => i.image_url)
      .filter(Boolean)
      .slice(0, maxImages) || [];
  const itemCount = collection.item_count || collection.items?.length || 0;

  const createdAt = collection.created_at
    ? new Date(collection.created_at).toLocaleDateString()
    : "Recently";

  const isFeatured = variant === "featured";
  const gradient =
    FEATURED_CARD_GRADIENTS[gradientIndex % FEATURED_CARD_GRADIENTS.length];

  return (
    <Link
      href={`/collections/${collection.id}`}
      className="block h-full group/card"
    >
      <div
        className={`relative bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-3xl hover:bg-zinc-800/50 transition-all cursor-pointer overflow-hidden h-full ${isFeatured ? "p-5 sm:p-6 group-hover/card:translate-y-[-4px]" : "p-4"}`}
      >
        {/* Animated gradient glow on hover (featured only) */}
        {isFeatured && (
          <div
            className="absolute -inset-4 rounded-3xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none mood-pill-glow z-0"
            style={{
              background: gradient,
              filter: "blur(24px)",
            }}
            aria-hidden
          />
        )}
        {/* Liquid Glass / Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none z-0" />

        {/* Image Strip Container */}
        <div
          className={`relative z-10 flex gap-1 mb-4 rounded-2xl overflow-hidden ${isFeatured ? "h-56 sm:h-64" : "h-48"}`}
        >
          {images.length > 0 ? (
            images.map((img, idx) => (
              <div
                key={idx}
                className={`relative h-full flex-1 min-w-0`}
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
        <div className="relative z-10 flex justify-between items-end">
          <div>
            {isFeatured && collection.curator_first_name && (
              <span className="text-sm font-medium lowercase block mb-1 bg-linear-to-r from-blue-400 to-pink-400 bg-clip-text text-transparent">
                @{collection.curator_first_name}
              </span>
            )}
            <h3
              className={`font-bold text-white leading-tight mb-1 group-hover/card:text-purple-400 transition-colors ${isFeatured ? "text-xl sm:text-xl line-clamp-1" : "text-lg"}`}
            >
              {collection.name}
            </h3>
            <p
              className={`text-zinc-400 line-clamp-2 hidden leading-relaxed ${isFeatured ? "text-base" : "text-sm"}`}
            >
              A collection of my favourite {collection.name.toLowerCase()} items
            </p>
          </div>
        </div>

        {/* Footer Tags */}
        <div className="relative z-10 flex gap-2 mt-4">
          <span className="px-3 py-1 rounded-lg bg-black/40 text-xs font-medium text-zinc-400 border border-white/5">
            {itemCount} titles
          </span>
          <span
            suppressHydrationWarning
            className="px-3 py-1 rounded-lg bg-black/40 text-xs font-medium text-zinc-400 border border-white/5"
          >
            {createdAt}
          </span>
        </div>
      </div>
    </Link>
  );
}
