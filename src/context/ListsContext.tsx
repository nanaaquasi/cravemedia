"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { EnrichedRecommendation, SavedList, JourneyItem } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/context/SessionContext";
import {
  deleteCollectionItem,
  deleteCollection,
  createCollectionWithItems,
  addItemToCollection,
} from "@/app/actions/collection";
import { deleteJourney } from "@/app/actions/journey";

export interface CreateListOptions {
  isJourney?: boolean;
  journeyMetadata?: Array<{
    position: number;
    whyThisPosition: string;
    whatYoullLearn: string;
    transitionToNext: string | null;
    difficultyLevel: string;
  }>;
  isPublic?: boolean;
  isExplicitlySaved?: boolean;
}

export interface ListsContextType {
  lists: SavedList[];
  createList: (
    name: string,
    description: string,
    items: EnrichedRecommendation[] | JourneyItem[],
    options?: CreateListOptions,
  ) => Promise<SavedList | null>;
  deleteList: (id: string) => Promise<void>;
  addItemToList: (
    listId: string,
    item: EnrichedRecommendation,
  ) => Promise<void>;
  removeItemFromList: (
    listId: string,
    item: EnrichedRecommendation,
  ) => Promise<void>;
  exportListAsText: (list: SavedList) => string;
  refreshLists: () => Promise<void>;
  isLoading: boolean;
}

const ListsContext = createContext<ListsContextType | undefined>(undefined);

export function ListsProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [lists, setLists] = useState<SavedList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Local storage fallback for non-auth users
  const [localLists, setLocalLists] = useState<SavedList[]>([]);

  const refreshLists = useCallback(async () => {
    if (!user) {
      setLists(localLists);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/lists");
      if (!response.ok) {
        throw new Error("Failed to fetch lists");
      }
      const data = await response.json();
      setLists(data.lists || []);
    } catch (e) {
      console.error("Error fetching lists", e);
    } finally {
      setIsLoading(false);
    }
  }, [user, localLists]);

  // Fetch data when user changes (AbortController prevents duplicate fetches in React Strict Mode)
  useEffect(() => {
    const ac = new AbortController();
    const run = async () => {
      if (!user) {
        setLists(localLists);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch("/api/lists", { signal: ac.signal });
        if (!res.ok) throw new Error("Failed to fetch lists");
        const data = await res.json();
        setLists(data.lists || []);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        console.error("Error fetching lists", e);
      } finally {
        if (!ac.signal.aborted) setIsLoading(false);
      }
    };
    run();
    return () => ac.abort();
  }, [user, localLists]);

  // Set up realtime subscriptions for automatic updates
  useEffect(() => {
    if (!user) return;

    // Subscribe to collections and journeys owned by the user
    const collectionsChannel = supabase
      .channel("collections-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collections",
          filter: `user_id=eq.${user.id}`,
        },
        () => refreshLists(),
      )
      .subscribe();

    const itemsChannel = supabase
      .channel("collection-items-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collection_items",
        },
        () => refreshLists(),
      )
      .subscribe();

    const journeysChannel = supabase
      .channel("journeys-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "journeys",
          filter: `user_id=eq.${user.id}`,
        },
        () => refreshLists(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(collectionsChannel);
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(journeysChannel);
    };
  }, [user, supabase, refreshLists]);

  // Keep local lists in sync if not logged in
  useEffect(() => {
    if (!user) {
      setLists(localLists);
    }
  }, [localLists, user]);

  const createList = useCallback(
    async (
      name: string,
      description: string,
      items: EnrichedRecommendation[] | JourneyItem[],
      options?: CreateListOptions,
    ) => {
      const newListLocal: SavedList = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name,
        description,
        items: items as EnrichedRecommendation[],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPublic: options?.isPublic ?? false,
        ...(options?.isJourney && { isJourney: true }),
        ...(options?.journeyMetadata && {
          journeyMetadata: options.journeyMetadata,
        }),
      };

      if (!user) {
        setLocalLists((prev) => [newListLocal, ...prev]);
        return newListLocal;
      }

      // If logged in, save to Supabase via server action
      if (options?.isJourney) {
        // Journeys are typically saved via saveJourneyData action.
        // If we reach here, we might need a server action or API route for creation too.
        // For now, ignoring direct journey creation here as it's handled elsewhere.
        return null;
      }

      const result = await createCollectionWithItems(name, description, items, {
        isPublic: options?.isPublic,
        isExplicitlySaved: options?.isExplicitlySaved,
      });

      if (result.error || !result.collectionId) return null;

      const savedList = { ...newListLocal, id: result.collectionId };
      setLists((prev) => [savedList, ...prev]);
      return savedList;
    },
    [user, setLocalLists],
  );

  const deleteList = useCallback(
    async (id: string) => {
      if (!user) {
        setLocalLists((prev) => prev.filter((list) => list.id !== id));
        return;
      }

      const list = lists.find((l) => l.id === id);
      const isJourney = list?.isJourney ?? false;

      // Optimistically delete from UI
      setLists((prev) => prev.filter((l) => l.id !== id));

      if (isJourney) {
        const result = await deleteJourney(id);
        if (result.error) {
          console.error("Failed to delete journey:", result.error);
          refreshLists(); // Rollback optimistic update
        }
      } else {
        const result = await deleteCollection(id);
        if (result?.error) {
          console.error("Failed to delete collection:", result.error);
          refreshLists(); // Rollback optimistic update
        }
      }
    },
    [user, lists, refreshLists],
  );

  const addItemToList = useCallback(
    async (listId: string, item: EnrichedRecommendation) => {
      if (!user) {
        // Local logic...
        setLocalLists((prev) =>
          prev.map((list) => {
            if (list.id !== listId) return list;
            if (list.items.some((i) => i.title === item.title)) return list;
            return {
              ...list,
              items: [...list.items, item],
              updatedAt: new Date().toISOString(),
            };
          }),
        );
        return;
      }

      const result = await addItemToCollection(listId, item);

      if (result.error) {
        console.error("Failed to add item to list:", result.error);
        return;
      }

      // Update local state
      setLists((prev) =>
        prev.map((list) => {
          if (list.id !== listId) return list;
          return { ...list, items: [...list.items, item] };
        }),
      );
    },
    [user],
  );

  const removeItemFromList = useCallback(
    async (listId: string, item: EnrichedRecommendation) => {
      const itemTitle = item.title;

      if (!user) {
        setLocalLists((prev) =>
          prev.map((list) => {
            if (list.id !== listId) return list;
            return {
              ...list,
              items: list.items.filter((i) => i.title !== itemTitle),
            };
          }),
        );
        return;
      }

      const list = lists.find((l) => l.id === listId);
      const isCollection = list && !list.isJourney;
      const collectionItemId = item.collectionItemId;

      if (isCollection && collectionItemId) {
        const result = await deleteCollectionItem(collectionItemId, listId);
        if (result.error) {
          console.error("Failed to remove item:", result.error);
          return;
        }
      }

      setLists((prev) =>
        prev.map((l) => {
          if (l.id !== listId) return l;
          return {
            ...l,
            items: l.items.filter((i) => i.title !== itemTitle),
          };
        }),
      );
    },
    [user, lists, setLocalLists],
  );

  const exportListAsText = useCallback((list: SavedList): string => {
    let text = `${list.name}\n`;
    text += `${list.description}\n\n`;
    list.items.forEach((item, i) => {
      text += `${i + 1}. ${item.title} (${item.year}) — ${item.creator}\n`;
      if (item.rating) text += `   Rating: ${item.rating}/10\n`;
      text += `   ${item.description}\n\n`;
    });
    return text;
  }, []);

  return (
    <ListsContext.Provider
      value={{
        lists,
        createList,
        deleteList,
        addItemToList,
        removeItemFromList,
        exportListAsText,
        refreshLists,
        isLoading,
      }}
    >
      {children}
    </ListsContext.Provider>
  );
}

export function useLists() {
  const context = useContext(ListsContext);
  if (context === undefined) {
    throw new Error("useLists must be used within a ListsProvider");
  }
  return context;
}
