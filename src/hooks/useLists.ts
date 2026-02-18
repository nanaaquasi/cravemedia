"use client";

import { useCallback } from "react";
import { EnrichedRecommendation, SavedList } from "@/lib/types";
import { useLocalStorage } from "./useLocalStorage";

export interface CreateListOptions {
  isJourney?: boolean;
  journeyMetadata?: Array<{
    position: number;
    whyThisPosition: string;
    whatYoullLearn: string;
    transitionToNext: string | null;
    difficultyLevel: string;
  }>;
}

export function useLists() {
  const [lists, setLists] = useLocalStorage<SavedList[]>("saved-lists", []);

  const createList = useCallback(
    (
      name: string,
      description: string,
      items: EnrichedRecommendation[],
      options?: CreateListOptions,
    ) => {
      const newList: SavedList = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name,
        description,
        items,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(options?.isJourney && { isJourney: true }),
        ...(options?.journeyMetadata && {
          journeyMetadata: options.journeyMetadata,
        }),
      };
      setLists((prev) => [newList, ...prev]);
      return newList;
    },
    [setLists],
  );

  const deleteList = useCallback(
    (id: string) => {
      setLists((prev) => prev.filter((list) => list.id !== id));
    },
    [setLists],
  );

  const addItemToList = useCallback(
    (listId: string, item: EnrichedRecommendation) => {
      setLists((prev) =>
        prev.map((list) => {
          if (list.id !== listId) return list;
          // Avoid duplicates
          if (
            list.items.some(
              (i) => i.title === item.title && i.creator === item.creator,
            )
          ) {
            return list;
          }
          return {
            ...list,
            items: [...list.items, item],
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [setLists],
  );

  const removeItemFromList = useCallback(
    (listId: string, itemTitle: string) => {
      setLists((prev) =>
        prev.map((list) => {
          if (list.id !== listId) return list;
          return {
            ...list,
            items: list.items.filter((i) => i.title !== itemTitle),
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [setLists],
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

  return {
    lists,
    createList,
    deleteList,
    addItemToList,
    removeItemFromList,
    exportListAsText,
  };
}
