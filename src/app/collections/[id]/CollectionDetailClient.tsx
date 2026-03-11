"use client";

import { Collection, CollectionItem } from "@/lib/supabase/types";
import type { SessionUser } from "@/app/api/auth/session/route";
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
  CheckCircle,
  Eye,
  EyeOff,
  Pause,
  Play,
  XCircle,
  Bookmark,
  Loader2,
  Trash2,
  Star,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ShareModal from "@/components/ShareModal";
import MediaSearchModal from "@/components/MediaSearchModal";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import CreateCollectionModal from "@/components/CreateCollectionModal";
import { FavoriteButton } from "@/components/FavoriteButton";
import Modal from "@/components/Modal";
import {
  toggleCollectionVisibility,
  reorderCollectionItems,
  cloneCollection,
  updateCollection,
  deleteCollection,
  deleteCollectionItem,
  updateCollectionItemStatus,
  type WatchStatus,
  reviewCollectionItem,
} from "@/app/actions/collection";
import { useLists } from "@/hooks/useLists";
import Toast from "@/components/Toast";
import {
  CRAVELIST_LABEL,
  CRAVELIST_LABEL_PLURAL,
} from "@/config/labels";
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

interface OwnerProfile {
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

interface CollectionDetailClientProps {
  collection: Collection;
  items: CollectionItem[];
  isOwner: boolean;
  isPublic: boolean;
  user: SessionUser | null;
  ownerProfile?: OwnerProfile;
  /** When true, auto-clone on mount (guest returned from login via Sign in to Save) */
  saveOnLoad?: boolean;
  /** When true, show "Saved to your cravelists" toast (redirected after clone) */
  savedToast?: boolean;
  /** User's clone of this collection (already saved) - show "View" instead of "Save" */
  existingCloneId?: string | null;
  contentStats?: { favorites_count: number; views_count: number };
  savesCount?: number;
}

export default function CollectionDetailClient({
  collection,
  items,
  isOwner,
  isPublic: initialIsPublic,
  user,
  ownerProfile,
  saveOnLoad = false,
  savedToast = false,
  existingCloneId = null,
  contentStats,
  savesCount = 0,
}: CollectionDetailClientProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reviewItem, setReviewItem] = useState<CollectionItem | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSpoilers, setReviewSpoilers] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [editName, setEditName] = useState(collection.name);
  const [editDescription, setEditDescription] = useState(
    collection.description ?? "",
  );
  const [isSavingCollection, setIsSavingCollection] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isEditMode, setIsEditMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<WatchStatus | "all">("all");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [orderedItems, setOrderedItems] = useState<CollectionItem[]>(items);
  const [prevItems, setPrevItems] = useState(items);

  const router = useRouter();

  // Show toast when redirected after successful save (guest saved list flow)
  useEffect(() => {
    if (savedToast) {
      setToastMessage(`Saved to your ${CRAVELIST_LABEL_PLURAL.toLowerCase()}`);
      router.replace(`/collections/${collection.id}`, { scroll: false });
    }
  }, [savedToast, collection.id, router]);

  // Auto-clone when guest returns from login with save=1 (Sign in to Save flow)
  useEffect(() => {
    if (!user || isOwner || !saveOnLoad) return;
    let cancelled = false;
    (async () => {
      setIsCloning(true);
      const result = await cloneCollection(collection.id);
      if (cancelled) return;
      setIsCloning(false);
      if (result.error) {
        setToastMessage(result.error);
      } else if (result.newCollectionId) {
        router.replace(`/collections/${result.newCollectionId}?saved=1`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isOwner, saveOnLoad, collection.id, router]);

  useEffect(() => {
    if (!isEditingCollection) {
      setEditName(collection.name);
      setEditDescription(collection.description ?? "");
    }
  }, [collection.name, collection.description, isEditingCollection]);

  useEffect(() => {
    if (!statusDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(e.target as Node)
      ) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [statusDropdownOpen]);

  if (items !== prevItems) {
    setPrevItems(items);
    const prevIds = new Set(orderedItems.map((i) => i.id));
    const nextIds = new Set(items.map((i) => i.id));
    const idsChanged =
      prevIds.size !== nextIds.size ||
      [...prevIds].some((id) => !nextIds.has(id));

    if (idsChanged) {
      setOrderedItems(items);
    } else {
      const freshById = new Map(items.map((i) => [i.id, i]));
      setOrderedItems(orderedItems.map((i) => freshById.get(i.id) ?? i));
    }
  }

  const { addItemToList, createList, refreshLists } = useLists();

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

  const handleSaveCollection = async () => {
    if (!editName.trim()) {
      setToastMessage("Name is required");
      return;
    }
    setIsSavingCollection(true);
    try {
      const result = await updateCollection(collection.id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      });
      if (result?.error) {
        setToastMessage(result.error);
      } else {
        setIsEditingCollection(false);
        setEditName(editName.trim());
        setEditDescription(editDescription.trim());
        setToastMessage(`${CRAVELIST_LABEL} updated`);
        router.refresh();
      }
    } catch {
      setToastMessage("Something went wrong");
    } finally {
      setIsSavingCollection(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(collection.name);
    setEditDescription(collection.description ?? "");
    setIsEditingCollection(false);
  };

  const handleDeleteCollection = async () => {
    const result = await deleteCollection(collection.id);
    if (result.error) {
      setToastMessage(result.error);
    } else {
      router.push("/profile");
    }
  };

  const handleToggleVisibility = async () => {
    const newIsPublic = !isPublic;
    setIsPublic(newIsPublic);
    const result = await toggleCollectionVisibility(collection.id, newIsPublic);
    if (!result.success) {
      setIsPublic(!newIsPublic);
      setToastMessage("Failed to update visibility");
    } else {
      setToastMessage(
        `${CRAVELIST_LABEL} is now ${newIsPublic ? "public" : "private"}`,
      );
    }
  };

  const handleCreateCollection = async ({
    name,
    description,
  }: {
    name: string;
    description: string;
  }) => {
    const result = await createList(name, description, [], {
      isPublic: false,
      isExplicitlySaved: true,
    });
    if (result?.id) {
      setToastMessage(`Created ${CRAVELIST_LABEL.toLowerCase()} "${name}"`);
      await refreshLists();
      setIsCreateModalOpen(false);
      router.push(`/collections/${result.id}`);
    } else {
      setToastMessage(`Failed to create ${CRAVELIST_LABEL.toLowerCase()}.`);
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: WatchStatus) => {
    setOrderedItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: newStatus,
              finished_at:
                newStatus === "watched" ? new Date().toISOString() : null,
            }
          : item,
      ),
    );

    const result = await updateCollectionItemStatus(
      itemId,
      collection.id,
      newStatus,
    );
    if (result.error) {
      setToastMessage(result.error);
      setOrderedItems(items);
    }
  };

  const handleOpenReview = (item: CollectionItem) => {
    setReviewItem(item);
    setReviewRating(item.item_rating ?? 0);
    setReviewText(item.review_text ?? "");
    setReviewSpoilers(item.contains_spoilers ?? false);
  };

  const handleSaveReview = async () => {
    if (!reviewItem) return;
    setIsSavingReview(true);
    const result = await reviewCollectionItem(reviewItem.id, collection.id, {
      rating: reviewRating || undefined,
      review: reviewText.trim() || undefined,
      containsSpoilers: reviewSpoilers,
    });
    setIsSavingReview(false);
    if (result.error) {
      setToastMessage(result.error);
    } else {
      setReviewItem(null);
      setToastMessage("Review saved");
      router.refresh();
    }
  };

  const handleAddItem = async (item: EnrichedRecommendation) => {
    try {
      await addItemToList(collection.id, item);
      setToastMessage(`Added "${item.title}" to ${CRAVELIST_LABEL.toLowerCase()}`);
      setIsSearchModalOpen(false);
      router.refresh();
    } catch (e) {
      console.error(e);
      setToastMessage("An error occurred");
    }
  };

  const handleRemoveItem = async (itemId: string, itemTitle: string) => {
    const result = await deleteCollectionItem(itemId, collection.id);
    if (result.error) {
      setToastMessage(result.error);
    } else {
      setOrderedItems((prev) => prev.filter((i) => i.id !== itemId));
      setToastMessage(`Removed "${itemTitle}" from ${CRAVELIST_LABEL.toLowerCase()}`);
      router.refresh();
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

  const getItemStatus = (item: CollectionItem): WatchStatus => {
    const raw = item.status as string | undefined;
    if (raw === "finished") return "watched";
    if (raw === "unfinished") return "not_seen";
    const valid: WatchStatus[] = [
      "watched",
      "dropped",
      "watching",
      "on_hold",
      "not_seen",
      "not_interested",
    ];
    return (valid.includes(raw as WatchStatus) ? raw : "not_seen") as WatchStatus;
  };

  const filteredItems =
    statusFilter === "all"
      ? orderedItems
      : orderedItems.filter((i) => getItemStatus(i) === statusFilter);

  const statusCounts = orderedItems.reduce(
    (acc, item) => {
      const s = getItemStatus(item);
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<WatchStatus, number>,
  );

  return (
    <div className="flex flex-col min-h-screen pb-12">
      {/* Header / Navigation */}
      <div className="mb-6 sm:mb-8 flex flex-col justify-start">
        <Link
          href={isOwner ? "/profile" : "/"}
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
        <div className="animate-fade-in-up mb-8 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            {ownerProfile?.avatarUrl ? (
              <img
                src={ownerProfile.avatarUrl}
                alt=""
                className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/30 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-purple-500/20 border-2 border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-sm shrink-0">
                {(
                  ownerProfile?.fullName?.[0] ||
                  ownerProfile?.username?.[0] ||
                  "?"
                ).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-white font-medium">
                Curated by{" "}
                <span className="text-purple-300">
                  {ownerProfile?.fullName ||
                    (ownerProfile?.username
                      ? `@${ownerProfile.username}`
                      : "a fellow explorer")}
                </span>
              </h3>
              <p className="text-sm text-white/60">
                Save this {CRAVELIST_LABEL.toLowerCase()} to your library to keep it.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-center sm:justify-start text-center sm:text-left">
            {user ? (
              existingCloneId ? (
                <Link
                  href={`/collections/${existingCloneId}`}
                  className="w-full sm:w-auto justify-center whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition-colors"
                >
                  <Bookmark className="w-4 h-4" />
                  View in My {CRAVELIST_LABEL_PLURAL}
                </Link>
              ) : (
                <button
                  onClick={async () => {
                    setIsCloning(true);
                    const result = await cloneCollection(collection.id);
                    setIsCloning(false);
                    if (result.error) {
                      setToastMessage(result.error);
                    } else if (result.newCollectionId) {
                      router.push(`/collections/${result.newCollectionId}?saved=1`);
                    }
                  }}
                  disabled={isCloning}
                  className="w-full sm:w-auto justify-center whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors cursor-pointer"
                >
                  {isCloning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                  {isCloning ? "Saving..." : `Save to My ${CRAVELIST_LABEL_PLURAL}`}
                </button>
              )
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/collections/${collection.id}?save=1`)}`}
                className="w-full sm:w-auto justify-center whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition-colors"
              >
                <Bookmark className="w-4 h-4" />
                Sign in to Save
              </Link>
            )}
            {user ? (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full sm:w-auto justify-center whitespace-nowrap px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-medium transition-colors cursor-pointer"
              >
                Create Your Own
              </button>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/collections/${collection.id}`)}`}
                className="w-full sm:w-auto justify-center whitespace-nowrap px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-medium transition-colors"
              >
                Create Your Own
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Cravelist Info */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold tracking-wider uppercase border border-purple-500/20">
              {CRAVELIST_LABEL}
            </span>
            <span className="text-zinc-500 text-xs font-medium">
              {items.length} titles
            </span>
            {isOwner && orderedItems.length > 0 && (
              <span className="text-zinc-500 text-xs font-medium">
                {orderedItems.filter(
                  (i) => i.status === "watched" || i.status === "dropped",
                ).length}
                /{orderedItems.length} finished
              </span>
            )}
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
                title={`Share ${CRAVELIST_LABEL.toLowerCase()}`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            )}
            <FavoriteButton
              targetType="collection"
              targetId={collection.id}
              title={collection.name}
              imageUrl={items[0]?.image_url ?? null}
              metadata={{ item_count: items.length }}
              size="sm"
            />
          </div>

          <div className="mb-4">
            {isOwner && isEditingCollection ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={isSavingCollection}
                  placeholder={`${CRAVELIST_LABEL} name`}
                  className="w-full text-4xl md:text-5xl font-black text-white tracking-tight leading-tight bg-transparent border-b-2 border-white/20 focus:border-purple-500 focus:outline-none pb-2"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  disabled={isSavingCollection}
                  placeholder="Description (optional)"
                  rows={3}
                  className="w-full text-lg text-zinc-400 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-purple-500 focus:outline-none resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveCollection}
                    disabled={isSavingCollection || !editName.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-medium text-sm cursor-pointer"
                  >
                    {isSavingCollection ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSavingCollection}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-medium text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="group">
                <div className="flex items-start gap-3">
                  <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                    {collection.name}
                  </h1>
                  {isOwner && (
                    <button
                      onClick={() => {
                        setEditName(collection.name);
                        setEditDescription(collection.description ?? "");
                        setIsEditingCollection(true);
                      }}
                      className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-opacity cursor-pointer shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                      title={`Edit ${CRAVELIST_LABEL.toLowerCase()}`}
                      aria-label={`Edit ${CRAVELIST_LABEL.toLowerCase()}`}
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                {(contentStats?.favorites_count ?? 0) > 0 ||
                (contentStats?.views_count ?? 0) > 0 ||
                savesCount > 0 ? (
                  <p className="text-zinc-500 text-sm mt-1 flex items-center gap-3">
                    {contentStats?.favorites_count ? (
                      <span>{contentStats.favorites_count} ♥</span>
                    ) : null}
                    {contentStats?.views_count ? (
                      <span>{contentStats.views_count.toLocaleString()} views</span>
                    ) : null}
                    {savesCount > 0 ? (
                      <span>{savesCount} saved</span>
                    ) : null}
                  </p>
                ) : null}
                {collection.description ? (
                  <p className="text-zinc-400 text-lg max-w-2xl leading-relaxed mt-1">
                    {collection.description}
                  </p>
                ) : isOwner ? (
                  <button
                    onClick={() => {
                      setEditName(collection.name);
                      setEditDescription(collection.description ?? "");
                      setIsEditingCollection(true);
                    }}
                    className="text-zinc-500 text-lg hover:text-zinc-400 transition-colors cursor-pointer text-left mt-1"
                  >
                    Add a description...
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Lower actions positioned to the right */}
        {isOwner && (
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0 mt-4 md:mt-0">
            {orderedItems.length > 0 && (
              <>
                {/* Status filter */}
                <div className="relative" ref={statusDropdownRef}>
                  <button
                    onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors cursor-pointer"
                    aria-expanded={statusDropdownOpen}
                  >
                    <span>
                      {statusFilter === "all"
                        ? "Status"
                        : WATCH_STATUSES.find((s) => s.value === statusFilter)
                            ?.label ?? statusFilter}
                    </span>
                    <span className="text-white/50">
                      ({statusFilter === "all" ? orderedItems.length : statusCounts[statusFilter] ?? 0})
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-white/50 transition-transform ${
                        statusDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {statusDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1 min-w-[140px] py-1 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl z-50">
                      <button
                        onClick={() => {
                          setStatusFilter("all");
                          setStatusDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <span>All statuses</span>
                        <span className="text-white/50">{orderedItems.length}</span>
                      </button>
                      {WATCH_STATUSES.map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => {
                            setStatusFilter(value);
                            setStatusDropdownOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <span>{label}</span>
                          <span className="text-white/50">{statusCounts[value] ?? 0}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

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
              </>
            )}

            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border bg-white/5 text-white border-white/10 hover:bg-white/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border bg-white/5 text-red-400/80 border-white/10 hover:bg-red-500/10 hover:text-red-400"
              title={`Delete ${CRAVELIST_LABEL.toLowerCase()}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
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
        statusFilter === "all" ? (
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
                    isOwner={isOwner}
                    onStatusChange={handleStatusChange}
                    onOpenReview={handleOpenReview}
                    onRemoveItem={handleRemoveItem}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <LayoutGrid className="w-8 h-8 text-zinc-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              No items match this filter
            </h2>
            <p className="text-zinc-400 text-sm max-w-sm mb-6">
              No items with status &quot;
              {WATCH_STATUSES.find((s) => s.value === statusFilter)?.label ??
                statusFilter}
              &quot;. Try a different filter.
            </p>
            <button
              onClick={() => setStatusFilter("all")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={() => {}}
          >
            <SortableContext
              items={filteredItems.map((i) => i.id)}
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
                {filteredItems.map((dbItem, index) => (
                  <SortableItemWrapper
                    key={dbItem.id}
                    dbItem={dbItem}
                    index={index}
                    viewMode={viewMode}
                    isEditMode={false}
                    isOwner={isOwner}
                    onStatusChange={handleStatusChange}
                    onOpenReview={handleOpenReview}
                    onRemoveItem={handleRemoveItem}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-20 h-20 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6">
            <Plus className="w-10 h-10 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            This {CRAVELIST_LABEL.toLowerCase()} is empty
          </h2>
          <p className="text-zinc-400 text-base max-w-sm mb-8">
            Add movies, TV shows, books, and anime to build your curated list.
          </p>
          {isOwner && (
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold text-sm hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-purple-500/25"
            >
              <Plus className="w-4 h-4" />
              Add Items
            </button>
          )}
        </div>
      )}

      <MediaSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelect={handleAddItem}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteCollection}
        title={`Delete ${CRAVELIST_LABEL.toLowerCase()}?`}
        description={`Are you sure you want to delete "${collection.name}"? This cannot be undone.`}
      />

      {/* Review Modal */}
      <Modal
        isOpen={!!reviewItem}
        onClose={() => !isSavingReview && setReviewItem(null)}
        maxSize="sm"
      >
        {reviewItem && (
          <div className="pt-2">
            <h3 className="text-lg font-semibold text-white mb-4">
              Rate & review
            </h3>
            <p className="text-zinc-400 text-sm mb-4 truncate">
              {(reviewItem.metadata as { title?: string })?.title ??
                reviewItem.title ??
                "Untitled"}
            </p>
            <div className="flex gap-0.5 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="p-0.5 rounded transition-colors cursor-pointer"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= reviewRating
                        ? "text-amber-400 fill-amber-400"
                        : "text-zinc-500 hover:text-amber-400/50"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-zinc-500 text-xs -mt-2 mb-2">
              {Number(reviewRating).toFixed(1)}/10
            </p>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value.slice(0, 280))}
              placeholder="Add a short review (optional)"
              rows={3}
              maxLength={280}
              disabled={isSavingReview}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none resize-none disabled:opacity-50 mb-4"
            />
            <p className="text-zinc-500 text-xs mb-3">
              {reviewText.length}/280
            </p>
            <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={reviewSpoilers}
                onChange={(e) => setReviewSpoilers(e.target.checked)}
                disabled={isSavingReview}
                className="w-4 h-4 rounded border-white/20 bg-black/50 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-zinc-300">
                This review contains spoilers
              </span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => !isSavingReview && setReviewItem(null)}
                disabled={isSavingReview}
                className="flex-1 py-2.5 rounded-xl font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReview}
                disabled={isSavingReview}
                className="flex-1 py-2.5 rounded-xl font-medium bg-purple-500 hover:bg-purple-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingReview ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={shareUrl}
        title={collection.name}
        isPublic={isPublic}
        contentType="collection"
        onMakePublic={
          isOwner
            ? async () => {
                setIsPublic(true);
                const result = await toggleCollectionVisibility(
                  collection.id,
                  true,
                );
                if (!result.success) {
                  setIsPublic(false);
                  setToastMessage("Failed to update visibility");
                } else {
                  setToastMessage(`${CRAVELIST_LABEL} is now public`);
                }
              }
            : undefined
        }
      />

      <CreateCollectionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onConfirm={handleCreateCollection}
      />
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}

const WATCH_STATUSES: {
  value: WatchStatus;
  icon: typeof CheckCircle;
  label: string;
  bookLabel: string;
  color: string;
}[] = [
  {
    value: "watched",
    icon: CheckCircle,
    label: "Watched",
    bookLabel: "Read",
    color: "green",
  },
  {
    value: "dropped",
    icon: EyeOff,
    label: "Dropped",
    bookLabel: "Dropped",
    color: "red",
  },
  {
    value: "watching",
    icon: Play,
    label: "Watching",
    bookLabel: "Reading",
    color: "blue",
  },
  {
    value: "on_hold",
    icon: Pause,
    label: "On Hold",
    bookLabel: "On Hold",
    color: "amber",
  },
  {
    value: "not_seen",
    icon: Eye,
    label: "Not Seen",
    bookLabel: "Not Seen",
    color: "zinc",
  },
  {
    value: "not_interested",
    icon: XCircle,
    label: "Not Interested",
    bookLabel: "Not Interested",
    color: "zinc",
  },
];

function getStatusColorClasses(color: string, isActive: boolean): string {
  const colorMap: Record<string, string> = {
    green: isActive
      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
      : "bg-black/50 text-white/80 hover:bg-black/60 hover:text-white",
    red: isActive
      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
      : "bg-black/50 text-white/80 hover:bg-black/60 hover:text-white",
    blue: isActive
      ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
      : "bg-black/50 text-white/80 hover:bg-black/60 hover:text-white",
    amber: isActive
      ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
      : "bg-black/50 text-white/80 hover:bg-black/60 hover:text-white",
    zinc: "bg-black/50 text-white/80 hover:bg-black/60 hover:text-white",
  };
  return colorMap[color] ?? colorMap.zinc;
}

interface SortableItemWrapperProps {
  dbItem: CollectionItem;
  index: number;
  viewMode: "grid" | "list";
  isEditMode: boolean;
  isOwner: boolean;
  onStatusChange: (itemId: string, status: WatchStatus) => void;
  onOpenReview: (item: CollectionItem) => void;
  onRemoveItem: (itemId: string, itemTitle: string) => void;
}

function SortableItemWrapper({
  dbItem,
  index,
  viewMode,
  isEditMode,
  isOwner,
  onStatusChange,
  onOpenReview,
  onRemoveItem,
}: SortableItemWrapperProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
  const rawStatus = dbItem.status as string | undefined;
  const currentStatus: WatchStatus =
    rawStatus === "finished"
      ? "watched"
      : rawStatus === "unfinished"
        ? "not_seen"
        : rawStatus && WATCH_STATUSES.some((s) => s.value === rawStatus)
          ? (rawStatus as WatchStatus)
          : "not_seen";
  const isBook = dbItem.media_type === "book";
  const isWatched = currentStatus === "watched";
  const isCompleted =
    currentStatus === "watched" || currentStatus === "dropped";

  const currentConfig =
    WATCH_STATUSES.find((s) => s.value === currentStatus) ?? WATCH_STATUSES[4];

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [dropdownOpen]);

  const StatusIcon = currentConfig.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isEditMode ? "animate-pulse-slow" : ""} ${
        isCompleted ? "ring-1 ring-green-500/30 rounded-2xl" : ""
      }`}
    >
      <RecommendationItem item={item} index={index} viewMode={viewMode} />
      {isOwner && (
        <>
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
          {/* Bottom-right of poster: status + review, visible on hover alongside the Movie tag */}
          <div
            ref={dropdownRef}
            className={`absolute z-20 flex items-center gap-1 ${
              viewMode === "grid"
                ? "bottom-[4.5rem] right-3"
                : "right-3 top-1/2 -translate-y-1/2"
            } opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200`}
          >
            {isWatched && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenReview(dbItem);
                }}
                className="p-2 rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 backdrop-blur-sm transition-colors cursor-pointer"
                title="Rate & review"
                aria-label="Rate and review"
              >
                <Star className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDropdownOpen((prev) => !prev);
              }}
              className={`p-2 rounded-full backdrop-blur-sm transition-all duration-200 cursor-pointer ${getStatusColorClasses(
                "green",
                currentStatus !== "not_seen",
              )}`}
              title="Watch status"
              aria-label="Change watch status"
              aria-expanded={dropdownOpen}
            >
              <StatusIcon className="w-4 h-4" />
            </button>
            {dropdownOpen && (
              <div
                role="menu"
                className="absolute right-0 bottom-full mb-1 py-1 min-w-[180px] rounded-lg bg-zinc-900/95 backdrop-blur border border-white/10 shadow-xl z-30"
                onClick={(e) => e.stopPropagation()}
              >
                {WATCH_STATUSES.map((opt) => {
                  const Icon = opt.icon;
                  const label = isBook ? opt.bookLabel : opt.label;
                  const isSelected = opt.value === currentStatus;
                  return (
                    <button
                      key={opt.value}
                      role="menuitem"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onStatusChange(dbItem.id, opt.value);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-white/10 text-white"
                          : "text-zinc-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {label}
                    </button>
                  );
                })}
                <div className="my-1 border-t border-white/10" />
                <button
                  role="menuitem"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveItem(dbItem.id, dbItem.title ?? item.title);
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  Remove from list
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
