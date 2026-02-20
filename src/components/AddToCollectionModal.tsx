"use client";

import { useState } from "react";
import { X, Plus, Check } from "lucide-react";
import { EnrichedRecommendation } from "@/lib/types";
import { useLists } from "@/hooks/useLists";
import CreateCollectionModal from "./CreateCollectionModal";

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: EnrichedRecommendation | null;
}

export default function AddToCollectionModal({
  isOpen,
  onClose,
  item,
}: AddToCollectionModalProps) {
  const { lists, addItemToList, createList } = useLists();
  const collections = lists.filter((l) => !l.isJourney);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [addingToListId, setAddingToListId] = useState<string | null>(null);
  const [addedToLists, setAddedToLists] = useState<Set<string>>(new Set());

  if (!isOpen || !item) return null;

  const handleAdd = async (listId: string) => {
    if (addedToLists.has(listId)) return;
    setAddingToListId(listId);

    try {
      await addItemToList(listId, item);
      setAddedToLists((prev) => new Set(prev).add(listId));
    } catch (e) {
      console.error(e);
    } finally {
      setAddingToListId(null);
    }
  };

  const handleCreateAndAdd = async ({
    name,
    description,
  }: {
    name: string;
    description: string;
  }) => {
    try {
      const newList = await createList(name, description, [item], {
        isPublic: false,
        isExplicitlySaved: true,
      });
      if (newList) {
        setAddedToLists((prev) => new Set(prev).add(newList.id));
      }
    } catch (e) {
      console.error("Failed to create and add", e);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity cursor-pointer"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Save to Collection
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 -mr-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-2 max-h-[60vh] overflow-y-auto min-h-[150px]">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left text-zinc-300 hover:text-white cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                <Plus size={18} />
              </div>
              <span className="font-medium text-sm">New Collection</span>
            </button>

            <div className="my-2 border-t border-white/5 mx-3" />

            {collections.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 text-sm">
                You don't have any collections yet.
              </div>
            ) : (
              <div className="space-y-1">
                {collections.map((col) => {
                  const isAdded = addedToLists.has(col.id);
                  const isAdding = addingToListId === col.id;

                  return (
                    <button
                      key={col.id}
                      onClick={() => handleAdd(col.id)}
                      disabled={isAdded || isAdding}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3 truncate pr-4">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                          <span className="text-sm font-bold text-zinc-500">
                            {col.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-sm text-zinc-300 group-hover:text-white truncate">
                          {col.name}
                        </span>
                      </div>
                      <div className="shrink-0 flex items-center">
                        {isAdding ? (
                          <div className="w-5 h-5 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                        ) : isAdded ? (
                          <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
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

      <CreateCollectionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onConfirm={handleCreateAndAdd}
      />
    </>
  );
}
