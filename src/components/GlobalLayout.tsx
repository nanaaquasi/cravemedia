"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import SavedListsPanel from "@/components/SavedListsPanel";
import { useLists } from "@/hooks/useLists";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import { EnrichedRecommendation } from "@/lib/types";

export default function GlobalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useSession();
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
      <div className="pt-20 flex flex-col min-h-screen px-4 md:px-10 lg:px-10 xl:px-20 overflow-x-clip pb-20 md:pb-0">
        <div className="flex-1 flex flex-col min-h-0">
          {children}
        </div>
        <Footer />
      </div>
      <MobileBottomNav
        onOpenLists={() => setShowSavedLists(true)}
        listsCount={lists.length}
      />
      <SavedListsPanel
        lists={lists}
        isOpen={showSavedLists}
        onClose={() => setShowSavedLists(false)}
        onDeleteList={deleteList}
        onRemoveItem={removeItemFromList}
        onExport={exportListAsText}
        onMoreLikeThis={handleMoreLikeThis}
        user={user}
      />
    </>
  );
}
