"use client";

import { useState, useEffect } from "react";
import { X, Plus, Check } from "lucide-react";
import { EnrichedRecommendation } from "@/lib/types";
import { useLists } from "@/hooks/useLists";
import { CRAVELIST_LABEL, CRAVELIST_LABEL_PLURAL } from "@/config/labels";
import Toast from "./Toast";
import { itemIsInSavedList } from "@/lib/list-membership";
import { useRouter } from "next/navigation";

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: EnrichedRecommendation | null;
  /** Called after the item is saved to a list (so parent can refresh server props). */
  onItemAdded?: () => void;
}

export default function AddToCollectionModal({
  isOpen,
  onClose,
  item,
  onItemAdded,
}: AddToCollectionModalProps) {
  const router = useRouter();
  const { lists, addItemToList, refreshLists } = useLists();
  const collections = lists.filter((l) => !l.isJourney);

  const [addingToListId, setAddingToListId] = useState<string | null>(null);
  const [addedToLists, setAddedToLists] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      void refreshLists();
      setAddedToLists(new Set());
    }
  }, [isOpen, item, refreshLists]);

  const handleAdd = async (listId: string) => {
    if (!item) return;
    const col = collections.find((c) => c.id === listId);
    if (!col) return;
    if (itemIsInSavedList(col, item)) return;
    if (addedToLists.has(listId)) return;

    setAddingToListId(listId);

    try {
      await addItemToList(listId, item);
      setAddedToLists((prev) => new Set(prev).add(listId));
      setToastMessage(`Added “${item.title}” to “${col.name}”`);
      onClose();
      onItemAdded?.();
    } catch (e) {
      console.error(e);
      setToastMessage("Couldn’t add to that list. Try again.");
    } finally {
      setAddingToListId(null);
    }
  };

  const handleCreateNewList = () => {
    if (!item) return;
    const itemParam = encodeURIComponent(JSON.stringify(item));
    router.push(`/collections/new?item=${itemParam}`);
    onClose();
  };

  const showMainModal = isOpen && item;

  return (
    <>
      {showMainModal && (
      <div className="fixed inset-0 z-100 flex items-center justify-center px-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity cursor-pointer"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Save to {CRAVELIST_LABEL}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -mr-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-2 max-h-[60vh] overflow-y-auto min-h-[150px]">
            <button
              type="button"
              onClick={handleCreateNewList}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left text-zinc-300 hover:text-white cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all shrink-0">
                <Plus size={18} />
              </div>
              <span className="font-medium text-sm">New {CRAVELIST_LABEL}</span>
            </button>

            <div className="my-2 border-t border-white/5 mx-3" />

            {collections.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 text-sm">
                You don&apos;t have any {CRAVELIST_LABEL_PLURAL.toLowerCase()}{" "}
                yet.
              </div>
            ) : (
              <div className="space-y-1">
                {collections.map((col) => {
                  const alreadyInList = itemIsInSavedList(col, item);
                  const sessionAdded = addedToLists.has(col.id);
                  const isAdding = addingToListId === col.id;
                  const done = alreadyInList || sessionAdded;

                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => handleAdd(col.id)}
                      disabled={alreadyInList || isAdding}
                      title={col.name}
                      className={`w-full flex items-center justify-between gap-2 p-3 rounded-xl text-left transition-colors min-h-13 ${
                        alreadyInList
                          ? "bg-white/4 cursor-not-allowed opacity-90"
                          : "hover:bg-white/5 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                          <span className="text-sm font-bold text-zinc-500">
                            {col.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-sm text-zinc-300 group-hover:text-white line-clamp-2 leading-snug">
                            {col.name}
                          </span>
                          {alreadyInList && (
                            <span className="block text-[11px] text-zinc-500 mt-0.5">
                              Already in this list
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center self-center">
                        {isAdding ? (
                          <div className="w-5 h-5 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                        ) : done ? (
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              alreadyInList
                                ? "bg-zinc-500/25 text-zinc-400"
                                : "bg-green-500/20 text-green-400"
                            }`}
                          >
                            <Check size={14} />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-white/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white/50 transition-all font-medium text-xs">
                            +
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      <Toast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
        wrapperClassName="!z-[120]"
      />
    </>
  );
}
