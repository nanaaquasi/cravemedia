"use client";

import { Collection, CollectionItem } from "@/lib/supabase/types";
import { User } from "@supabase/supabase-js";
import { EnrichedRecommendation } from "@/lib/types";
import RecommendationItem from "@/components/RecommendationItem";
import {
  ArrowLeft,
  Globe,
  Lock,
  Share2,
  MoreHorizontal,
  Plus,
  LayoutGrid,
  List,
  GripVertical,
  Edit2,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ShareModal from "@/components/ShareModal";
import MediaSearchModal from "@/components/MediaSearchModal";
import {
  toggleCollectionVisibility,
  reorderCollectionItems,
} from "@/app/actions/collection";
import { useLists } from "@/hooks/useLists";
import Toast from "@/components/Toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CollectionDetailClientProps {
  collection: Collection;
  items: CollectionItem[];
  isOwner: boolean;
  isPublic: boolean;
  user: User | null;
}

export default function CollectionDetailClient({
  collection,
  items,
  isOwner,
  isPublic: initialIsPublic,
  user,
}: CollectionDetailClientProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isEditMode, setIsEditMode] = useState(false);
  const [orderedItems, setOrderedItems] = useState<CollectionItem[]>(items);

  useEffect(() => {
    // Sync items if external changes occur (like adding/deleting)
    // In a robust app, we should check if lengths or ids changed
    setOrderedItems(items);
  }, [items]);

  const router = useRouter();
  const { addItemToList } = useLists();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before dragging starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleToggleVisibility = async () => {
    const newIsPublic = !isPublic;
    setIsPublic(newIsPublic);
    const result = await toggleCollectionVisibility(collection.id, newIsPublic);
    if (!result.success) {
      setIsPublic(!newIsPublic);
      setToastMessage("Failed to update visibility");
    } else {
      setToastMessage(
        `Collection is now ${newIsPublic ? "public" : "private"}`,
      );
    }
  };

  const handleAddItem = async (item: EnrichedRecommendation) => {
    try {
      await addItemToList(collection.id, item);
      setToastMessage(`Added "${item.title}" to collection`);
      setIsSearchModalOpen(false);
      router.refresh();
    } catch (e) {
      console.error(e);
      setToastMessage("An error occurred");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedItems.findIndex((item) => item.id === active.id);
      const newIndex = orderedItems.findIndex((item) => item.id === over.id);

      const newOrderedItems = arrayMove(orderedItems, oldIndex, newIndex);
      setOrderedItems(newOrderedItems);

      // Save to backend optionally updating positions
      const newOrderedIds = newOrderedItems.map((item) => item.id);
      const res = await reorderCollectionItems(collection.id, newOrderedIds);
      if (res.error) {
        setToastMessage("Failed to save new order");
        // Opt out of optimistic update if it fails
        setOrderedItems(orderedItems);
      }
    }
  };

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/collections/${collection.id}`
      : "";

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header / Navigation */}
      <div className="mb-6 sm:mb-8 flex flex-col justify-start">
        <Link
          href={isOwner ? "/account" : "/"}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group self-start"
        >
          <div className="p-2 rounded-full bg-black/20 group-hover:bg-black/40 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">
            {isOwner ? "Back to Profile" : "Back to Home"}
          </span>
        </Link>
      </div>

      {!isOwner && (
        <div className="animate-fade-in-up mb-8 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-white font-medium mb-1">
              Created by someone else
            </h3>
            <p className="text-sm text-white/70">
              Create your own customized collection of your favorite movies, TV
              shows, and books.
            </p>
          </div>
          <Link
            href="/"
            className="whitespace-nowrap px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition-colors"
          >
            Create Your Own
          </Link>
        </div>
      )}

      {/* Collection Info */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold tracking-wider uppercase border border-purple-500/20">
              Collection
            </span>
            <span className="text-zinc-500 text-xs font-medium">
              {items.length} titles
            </span>
            {isOwner && (
              <button
                onClick={handleToggleVisibility}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                  isPublic
                    ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                }`}
              >
                {isPublic ? (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Public</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Private</span>
                  </>
                )}
              </button>
            )}
            {user && (
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                title="Share collection"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            )}
          </div>

          <div className="mb-4">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              {collection.name}
            </h1>
          </div>

          {collection.description && (
            <p className="text-zinc-400 text-lg max-w-2xl leading-relaxed">
              {collection.description}
            </p>
          )}
        </div>

        {/* Lower actions positioned to the right */}
        {isOwner && (
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0 mt-4 md:mt-0">
            {/* View Toggle */}
            <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white/20 text-white"
                    : "text-white/40 hover:text-white/80"
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white/20 text-white"
                    : "text-white/40 hover:text-white/80"
                }`}
                title="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Edit / Reorder Toggle */}
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                isEditMode
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                  : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
              }`}
            >
              {isEditMode ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Done Editing</span>
                </>
              ) : (
                <>
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Order</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border bg-white/5 text-white border-white/10 hover:bg-white/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
            <button
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer border border-white/5 flex items-center justify-center"
              title="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Items Grid */}
      {orderedItems.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedItems.map((i) => i.id)}
            strategy={
              viewMode === "list"
                ? verticalListSortingStrategy
                : rectSortingStrategy
            }
          >
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
                  : "grid grid-cols-1 md:grid-cols-2 gap-4"
              }
            >
              {orderedItems.map((dbItem, index) => (
                <SortableItemWrapper
                  key={dbItem.id}
                  dbItem={dbItem}
                  index={index}
                  viewMode={viewMode}
                  isEditMode={isEditMode}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center rounded-3xl bg-zinc-900/30 border border-white/5">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-3xl mb-6">
            📋
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            This collection is empty
          </h2>
          <p className="text-zinc-500 text-sm max-w-xs">
            Start exploring and add your favorite movies, TV shows, and books to
            this collection.
          </p>
          {isOwner && (
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="mt-8 px-6 py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              Add Your First Item
            </button>
          )}
        </div>
      )}

      <MediaSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelect={handleAddItem}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={shareUrl}
        title={collection.name}
      />

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}

interface SortableItemWrapperProps {
  dbItem: CollectionItem;
  index: number;
  viewMode: "grid" | "list";
  isEditMode: boolean;
}

function SortableItemWrapper({
  dbItem,
  index,
  viewMode,
  isEditMode,
}: SortableItemWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dbItem.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  const item = dbItem.metadata as unknown as EnrichedRecommendation;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isEditMode ? "animate-pulse-slow" : ""}`}
    >
      <RecommendationItem item={item} index={index} viewMode={viewMode} />
      {isEditMode && (
        <button
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-20 p-2 bg-black/60 backdrop-blur rounded-lg cursor-grab active:cursor-grabbing text-white md:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity outline-none"
          title="Drag to reorder"
          aria-label="Drag to reorder item"
        >
          <GripVertical className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
