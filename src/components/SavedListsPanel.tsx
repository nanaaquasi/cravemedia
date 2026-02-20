"use client";

import { SavedList, EnrichedRecommendation } from "@/lib/types";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Share2, Copy, Trash2, Check } from "lucide-react";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import ShareModal from "./ShareModal";
import { User } from "@supabase/supabase-js";

interface SavedListsPanelProps {
  lists: SavedList[];
  isOpen: boolean;
  onClose: () => void;
  onDeleteList: (id: string) => void;
  onRemoveItem: (listId: string, itemTitle: string) => void;
  onExport: (list: SavedList) => string;
  onMoreLikeThis?: (item: EnrichedRecommendation) => void;
  user?: User | null;
}

export default function SavedListsPanel({
  lists,
  isOpen,
  onClose,
  onDeleteList,
  onRemoveItem,
  onExport,
  onMoreLikeThis,
  user,
}: SavedListsPanelProps) {
  const [expandedList, setExpandedList] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [listToDelete, setListToDelete] = useState<string | null>(null);

  const [shareConfig, setShareConfig] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = async (list: SavedList) => {
    const text = onExport(list);
    await navigator.clipboard.writeText(text);
    setCopiedId(list.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getListName = (id: string | null) =>
    lists.find((l) => l.id === id)?.name || "this list";

  const handleShareList = (list: SavedList) => {
    const baseUrl = window.location.origin;
    const url = list.isJourney
      ? `${baseUrl}/journey/${list.id}`
      : `${baseUrl}/collections/${list.id}`;

    setShareConfig({ url, title: list.name });
    setIsShareModalOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Panel - flex + overflow for single scroll area */}
        <div className="relative flex flex-col w-full max-w-md h-full bg-gradient-mesh border-l border-white/5 animate-slide-in-right">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[var(--bg-primary)]/90 backdrop-blur-md px-4 sm:px-6 md:px-8 py-4 sm:py-5 border-b border-white/5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">My Cravings</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-black/40 transition-colors cursor-pointer"
                aria-label="Close my cravings"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Lists - only this section scrolls */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-8 space-y-4">
            {lists.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-[var(--text-secondary)] text-sm">
                  No saved cravings yet
                </p>
                <p className="text-[var(--text-muted)] text-xs mt-1">
                  Add items from recommendations to create a list
                </p>
              </div>
            ) : (
              lists.map((list) => (
                <div key={list.id} className="glass rounded-xl overflow-hidden">
                  {/* List header */}
                  <button
                    onClick={() =>
                      setExpandedList(expandedList === list.id ? null : list.id)
                    }
                    className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-black/20 transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">{list.name}</h3>
                        {list.isJourney && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/25 text-purple-300 border border-purple-500/30">
                            Journey
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {list.items.length} items
                      </p>
                    </div>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`transition-transform duration-200 text-[var(--text-muted)] ${
                        expandedList === list.id ? "rotate-180" : ""
                      }`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Expanded items */}
                  {expandedList === list.id && (
                    <div className="border-t border-white/5">
                      {list.items.map((item, idx) => (
                        <div
                          key={`${item.title}-${idx}`}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-black/10 group"
                        >
                          {list.isJourney && list.journeyMetadata && (
                            <span className="w-5 text-xs text-[var(--text-muted)] flex-shrink-0">
                              {list.journeyMetadata[idx]?.position ?? idx + 1}
                            </span>
                          )}
                          <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-white/5">
                            {item.posterUrl ? (
                              <Image
                                src={item.posterUrl}
                                unoptimized
                                alt={item.title}
                                width={32}
                                height={32}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">
                                {item.type === "movie"
                                  ? "🎬"
                                  : item.type === "tv"
                                    ? "📺"
                                    : "📚"}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{item.title}</p>
                            <p className="text-xs text-[var(--text-muted)] truncate">
                              {item.creator}
                            </p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onMoreLikeThis && (
                              <button
                                onClick={() => {
                                  onMoreLikeThis(item);
                                  onClose();
                                }}
                                className="p-1 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                                title="More like this"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <circle cx="11" cy="11" r="8" />
                                  <path d="m21 21-4.3-4.3" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => onRemoveItem(list.id, item.title)}
                              className="p-1 rounded hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 transition-colors cursor-pointer"
                              title="Remove"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* List actions */}
                      <div className="px-4 py-3 border-t border-white/5 flex gap-2 w-full">
                        {user && (
                          <button
                            onClick={() => handleShareList(list)}
                            className="flex-4 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer"
                          >
                            <Share2 size={14} />
                            Share
                          </button>
                        )}
                        <button
                          onClick={() => handleExport(list)}
                          className={`flex-[5] flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-black/20 hover:bg-black/40 transition-colors cursor-pointer ${
                            copiedId === list.id
                              ? "text-green-400"
                              : "text-[var(--text-secondary)]"
                          }`}
                        >
                          {copiedId === list.id ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                          {copiedId === list.id ? "Copied" : "Copy text"}
                        </button>
                        <button
                          onClick={() => setListToDelete(list.id)}
                          title="Delete list"
                          className="flex items-center justify-center text-xs py-1.5 px-3 rounded-lg hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-colors cursor-pointer flex-2"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={!!listToDelete}
        onClose={() => setListToDelete(null)}
        onConfirm={() => listToDelete && onDeleteList(listToDelete)}
        title="Delete List?"
        description={`Are you sure you want to delete "${getListName(listToDelete)}"? This cannot be undone.`}
      />

      {shareConfig && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          url={shareConfig.url}
          title={shareConfig.title}
        />
      )}
    </>
  );
}
