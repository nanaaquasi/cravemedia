"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/components/navigation/Sidebar";
import MobileTabBar from "@/components/navigation/MobileTabBar";
import SavedListsPanel from "@/components/SavedListsPanel";
import { SidebarProvider } from "@/context/SidebarContext";
import { useLists } from "@/hooks/useLists";
import { useSession } from "@/context/SessionContext";
import { EnrichedRecommendation } from "@/lib/types";

function GlobalLayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const [showSavedLists, setShowSavedLists] = useState(false);
  const { lists, deleteList, removeItemFromList, exportListAsText } =
    useLists();
  const router = useRouter();
  const searchParams = useSearchParams();

  // After sign-in from My Cravelists prompt, open the panel
  useEffect(() => {
    if (user && searchParams.get("openSavedLists") === "1") {
      router.replace("/", { scroll: false });
      const id = setTimeout(() => setShowSavedLists(true), 0);
      return () => clearTimeout(id);
    }
  }, [user, searchParams, router]);

  const handleMoreLikeThis = (item: EnrichedRecommendation) => {
    const query = `More ${item.type === "book" ? "books" : item.type === "tv" ? "TV shows" : "movies"} like "${item.title}" by ${item.creator}`;
    const params = new URLSearchParams({ q: query, type: item.type });
    router.push(`/search?${params.toString()}`);
  };

  return (
    <>
      <Sidebar
        onOpenSavedLists={() => setShowSavedLists(true)}
        listsCount={lists.length}
      />
      <main className="min-h-screen md:pb-0 md:pt-0 md:ml-[240px] pwa-safe-area-main">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-5 md:px-10 lg:px-14 xl:px-16">
          <div className="flex-1 flex flex-col min-h-0 pt-6 md:pt-8">
            {children}
          </div>
        </div>
      </main>
      <MobileTabBar
        onOpenSavedLists={() => setShowSavedLists(true)}
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

export default function GlobalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <GlobalLayoutContent>{children}</GlobalLayoutContent>
    </SidebarProvider>
  );
}
