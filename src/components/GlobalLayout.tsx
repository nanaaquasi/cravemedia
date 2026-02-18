"use client";

import { useState } from "react";
import Header from "@/components/Header";
import SavedListsPanel from "@/components/SavedListsPanel";
import { useLists } from "@/hooks/useLists";
import { useRouter } from "next/navigation";
import { EnrichedRecommendation } from "@/lib/types";

export default function GlobalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showSavedLists, setShowSavedLists] = useState(false);
  const { lists, deleteList, removeItemFromList, exportListAsText } =
    useLists();
  const router = useRouter();

  const handleMoreLikeThis = (item: EnrichedRecommendation) => {
    const query = `More ${item.type === "book" ? "books" : item.type === "tv" ? "TV shows" : "movies"} like "${item.title}" by ${item.creator}`;
    const params = new URLSearchParams({ q: query, type: item.type });
    router.push(`/search?${params.toString()}`);
  };

  return (
    <>
      <Header onOpenSavedLists={() => setShowSavedLists(true)} />
      <div className="pt-20 flex flex-col min-h-screen">{children}</div>
      <SavedListsPanel
        lists={lists}
        isOpen={showSavedLists}
        onClose={() => setShowSavedLists(false)}
        onDeleteList={deleteList}
        onRemoveItem={removeItemFromList}
        onExport={exportListAsText}
        onMoreLikeThis={handleMoreLikeThis}
      />
    </>
  );
}
