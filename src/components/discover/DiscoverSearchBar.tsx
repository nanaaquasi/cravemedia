"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { track } from "@vercel/analytics";
import type { EnrichedRecommendation } from "@/lib/types";
import MediaSearchModal from "@/components/MediaSearchModal";
import AddToCollectionModal from "@/components/AddToCollectionModal";

function mediaDetailHref(item: EnrichedRecommendation): string | null {
  if (!item.externalId) return null;
  const t = item.type;
  if (t === "movie" || t === "tv" || t === "book" || t === "anime") {
    return `/media/${t}/${item.externalId}`;
  }
  return null;
}

export function DiscoverSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedItemForAdd, setSelectedItemForAdd] = useState<EnrichedRecommendation | null>(null);

  useEffect(() => {
    if (!pendingHref) return;
    if (pathname === pendingHref) {
      setPendingHref(null);
      setIsOpen(false);
    }
  }, [pathname, pendingHref]);

  useEffect(() => {
    if (!pendingHref) return;
    const t = window.setTimeout(() => {
      setPendingHref(null);
      setIsOpen(false);
    }, 15_000);
    return () => window.clearTimeout(t);
  }, [pendingHref]);

  const handleClose = useCallback(() => {
    if (pendingHref) return;
    setIsOpen(false);
  }, [pendingHref]);

  const handleSelect = useCallback(
    (item: EnrichedRecommendation) => {
      const href = mediaDetailHref(item);
      if (!href) return;
      track("Discover media search pick", {
        type: item.type,
        hasId: Boolean(item.externalId),
      });
      void router.prefetch(href);
      setPendingHref(href);
      router.push(href);
    },
    [router],
  );

  const handleResultHover = useCallback(
    (item: EnrichedRecommendation) => {
      const href = mediaDetailHref(item);
      if (href) void router.prefetch(href);
    },
    [router],
  );

  const handleAddClick = useCallback((item: EnrichedRecommendation) => {
    setSelectedItemForAdd(item);
    setIsAddModalOpen(true);
  }, []);

  return (
    <div className="relative z-30 w-full">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center gap-3 rounded-full border border-purple-500/35 bg-black/60 py-3 pl-4 pr-4 text-left text-[15px] text-zinc-500 shadow-inner transition-[border-color,box-shadow] hover:border-purple-500/50 focus:border-purple-500/60 focus:outline-none focus:ring-2 focus:ring-purple-500/25 cursor-pointer"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Search className="h-5 w-5 shrink-0 text-zinc-400" aria-hidden />
        <span>Search movies, TV, books, anime…</span>
      </button>

      <MediaSearchModal
        isOpen={isOpen}
        onClose={handleClose}
        onSelect={handleSelect}
        onAddClick={handleAddClick}
        title="Discover"
        isNavigating={Boolean(pendingHref)}
        onResultHover={handleResultHover}
      />

      <AddToCollectionModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedItemForAdd(null);
        }}
        item={selectedItemForAdd}
      />
    </div>
  );
}
