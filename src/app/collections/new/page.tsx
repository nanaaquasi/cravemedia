"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CRAVELIST_LABEL } from "@/config/labels";
import {
  Sparkles,
  Loader2,
  ArrowLeft,
  Plus,
  UploadCloud,
  Lock,
  Globe,
  ListOrdered,
  GripVertical,
  Trash2,
  LayoutGrid,
  List,
} from "lucide-react";
import { createCollectionWithItems } from "@/app/actions/collection";
import { EnrichedRecommendation } from "@/lib/types";
import MediaSearchModal from "@/components/MediaSearchModal";
import Papa from "papaparse";
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

// Extend type to include local unique id for sorting
type LocalItem = EnrichedRecommendation & { _localId: string };

function SortableMediaCard({
  item,
  index,
  isRanked,
  isListView,
  onRemove,
}: {
  item: LocalItem;
  index: number;
  isRanked: boolean;
  isListView: boolean;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._localId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  if (isListView) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="group relative flex items-center gap-4 bg-zinc-900 border border-white/10 rounded-xl p-3 hover:bg-white/5 transition-colors"
      >
        <button
          className="p-2 text-zinc-500 hover:text-white cursor-grab active:cursor-grabbing hover:bg-white/10 rounded-lg transition-colors"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {isRanked && (
          <div className="w-8 h-8 shrink-0 bg-purple-500 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg">
            {index + 1}
          </div>
        )}

        {item.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.posterUrl}
            alt={item.title}
            className="w-12 h-16 object-cover rounded-md shrink-0"
          />
        ) : (
          <div className="w-12 h-16 bg-zinc-800 rounded-md shrink-0 flex items-center justify-center">
            <span className="text-[10px] text-zinc-500 px-1 text-center line-clamp-2">
              {item.title}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-white text-base font-medium truncate">
            {item.title}
          </p>
          <p className="text-zinc-400 text-sm">{item.year || item.type}</p>
        </div>

        <button
          onClick={onRemove}
          className="p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 rounded-lg cursor-pointer shrink-0"
          aria-label="Remove item"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group aspect-2/3 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 ${
        isDragging
          ? "shadow-2xl shadow-purple-500/20 ring-2 ring-purple-500"
          : ""
      }`}
    >
      {item.posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.posterUrl}
          alt={item.title}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-800 p-4 text-center">
          <span className="text-sm font-medium text-zinc-500 line-clamp-3">
            {item.title}
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
        <div className="flex justify-between items-start w-full">
          <button
            className="p-1.5 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur transition-colors cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full backdrop-blur transition-colors cursor-pointer shadow-xl shadow-black"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div>
          {isRanked && (
            <div className="mb-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg">
              {index + 1}
            </div>
          )}
          <p className="text-white text-sm font-medium truncate">
            {item.title}
          </p>
          <p className="text-zinc-300 text-xs">{item.year || item.type}</p>
        </div>
      </div>
    </div>
  );
}

const DRAFT_STORAGE_KEY = "cravelist-draft";

function loadDraft() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      name: string;
      description: string;
      isPublic: boolean;
      isRanked: boolean;
      items: LocalItem[];
      viewMode: "grid" | "list";
    };
  } catch {
    return null;
  }
}

function CreateCollectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const draft = useRef(loadDraft()).current;
  const itemParam = searchParams.get("item");
  const hasItemParam = Boolean(itemParam);

  // Form state — restore from draft when no query param override
  const [name, setName] = useState(draft?.name ?? "");
  const [description, setDescription] = useState(draft?.description ?? "");
  const [isPublic, setIsPublic] = useState(draft?.isPublic ?? false);
  const [isRanked, setIsRanked] = useState(draft?.isRanked ?? false);
  const [savedCollectionId, setSavedCollectionId] = useState<string | null>(null);

  const [items, setItems] = useState<LocalItem[]>(() => {
    if (hasItemParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(itemParam!));
        if (parsed && parsed.title) {
          return [
            {
              ...parsed,
              _localId: `initial-${Date.now()}`,
            },
          ];
        }
      } catch (err) {
        console.error("Failed to parse initial item", err);
      }
    }
    if (draft?.items?.length) return draft.items;
    return [];
  });

  // UI State
  const [viewMode, setViewMode] = useState<"grid" | "list">(draft?.viewMode ?? "list");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Suggestions State
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Persist draft to localStorage on every meaningful change
  useEffect(() => {
    if (savedCollectionId) return;
    const hasDraftContent = name || description || items.length > 0;
    if (!hasDraftContent) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({ name, description, isPublic, isRanked, items, viewMode }),
    );
  }, [name, description, isPublic, isRanked, items, viewMode, savedCollectionId]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }, []);

  // Warn before unload when unsaved changes exist
  useEffect(() => {
    if (savedCollectionId || items.length === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [items.length, savedCollectionId]);

  const handleSuggestNames = async () => {
    if (items.length === 0) return;
    setIsSuggesting(true);
    setSuggestions([]);
    try {
      const response = await fetch("/api/collections/suggest-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titles: items.map((i) => i.title) }),
      });
      const data = await response.json();
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      } else if (data.error) {
        setToastMessage(data.error);
      }
    } catch {
      setToastMessage("Failed to generate suggestions");
    } finally {
      setIsSuggesting(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prevItems) => {
        const oldIndex = prevItems.findIndex(
          (item) => item._localId === active.id,
        );
        const newIndex = prevItems.findIndex(
          (item) => item._localId === over.id,
        );
        return arrayMove(prevItems, oldIndex, newIndex);
      });
    }
  };

  const handleAddItem = (item: EnrichedRecommendation) => {
    setItems((prev) => {
      // Prevent duplicates
      if (
        prev.some(
          (i) => i.externalId === item.externalId && i.type === item.type,
        )
      ) {
        return prev;
      }
      return [
        ...prev,
        {
          ...item,
          _localId:
            Date.now().toString() + Math.random().toString(36).substring(2),
        },
      ];
    });
    setToastMessage(`Added "${item.title}"`);
    setIsSearchOpen(false);
  };

  const handleRemoveItem = (indexToRemove: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setToastMessage("Please upload a valid CSV file.");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data as Record<string, string>[];
          const importedItems: LocalItem[] = rows.map((row) => ({
            title:
              row.Title || row.title || row.Name || row.name || "Unknown Title",
            year: Number(row.Year || row.year) || 0,
            type: (row.Type || row.type || "movie")
              .toLowerCase()
              .includes("movie")
              ? "movie"
              : "tv",
            creator: row.Creator || row.Director || row.Author || "Unknown",
            description: row.Description || row.Overview || "Imported item.",
            genres: row.Genres ? row.Genres.split(",") : ["Imported"],
            posterUrl: row.Poster || row.Image || null,
            rating: null,
            ratingSource: null,
            runtime: null,
            externalId: null,
            _localId: `csv-${Date.now()}-${Math.random().toString(36).substring(2)}`,
          }));

          if (importedItems.length === 0) {
            setToastMessage("No readable records found in the CSV.");
            return;
          }

          setItems((prev) => [...prev, ...importedItems]);
          setToastMessage(
            `Successfully imported ${importedItems.length} items`,
          );
        } catch {
          setToastMessage("Failed to process importing items.");
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      error: () => {
        setToastMessage("CSV Parser Error");
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setToastMessage("Please provide a name");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createCollectionWithItems(
        name.trim(),
        description.trim(),
        items,
        { isPublic },
      );

      if (result.error) {
        setToastMessage(result.error);
        setIsSubmitting(false);
      } else if (result.collectionId) {
        clearDraft();
        setSavedCollectionId(result.collectionId);
        setToastMessage(`${CRAVELIST_LABEL} saved successfully!`);
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to save collection";
      setToastMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col max-w-6xl mx-auto w-full pt-10 md:pt-6 min-h-screen">
      <div className="mb-6 md:mb-10 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group cursor-pointer"
        >
          <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Details - Sticky on large screens */}
        <div className="lg:col-span-1 lg:sticky lg:top-8 lg:self-start space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 liquid-glass">
            <h1 className="text-2xl font-bold text-white mb-6">
              Create {CRAVELIST_LABEL}
            </h1>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Name <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Mind-bending Sci-Fi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                />

                {/* AI Suggestion Trigger */}
                {items.length > 0 &&
                  !name.trim() &&
                  !isSuggesting &&
                  suggestions.length === 0 && (
                    <button
                      onClick={handleSuggestNames}
                      className="mt-3 flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors mx-1 cursor-pointer group"
                    >
                      <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                      Out of ideas? Let&apos;s suggest a title
                    </button>
                  )}

                {/* AI Loading State */}
                {isSuggesting && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400 mx-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    Generating ideas based on your items...
                  </div>
                )}

                {/* AI Suggestions List */}
                {suggestions.length > 0 && !name.trim() && !isSuggesting && (
                  <div className="mt-4 animate-slide-up bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <p className="text-xs text-purple-300/80 font-medium">
                        Suggested Names:
                      </p>
                      <button
                        onClick={handleSuggestNames}
                        className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Get new suggestions"
                      >
                        Refresh
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setName(sug);
                            setSuggestions([]);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 hover:border-purple-500/30 hover:bg-purple-500/20 text-sm text-white transition-all text-left cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  placeholder={`What's this ${CRAVELIST_LABEL.toLowerCase()} about?`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  rows={4}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none"
                />
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${isPublic ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-400"}`}
                    >
                      {isPublic ? (
                        <Globe className="w-4 h-4" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">
                        {isPublic ? "Public List" : "Private List"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {isPublic
                          ? "Anyone can view this list"
                          : "Only you can view"}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-10 h-6 rounded-full p-1 transition-colors ${isPublic ? "bg-purple-500" : "bg-zinc-700"}`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${isPublic ? "translate-x-4" : "translate-x-0"}`}
                    />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsRanked(!isRanked)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${isRanked ? "bg-purple-500/20 text-purple-400" : "bg-zinc-800 text-zinc-400"}`}
                    >
                      <ListOrdered className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">
                        Ranked List
                      </p>
                      <p className="text-xs text-zinc-500">
                        Number items progressively
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-10 h-6 rounded-full p-1 transition-colors ${isRanked ? "bg-purple-500" : "bg-zinc-700"}`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${isRanked ? "translate-x-4" : "translate-x-0"}`}
                    />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons: Moved from header to under the sidebar */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {savedCollectionId ? (
              <Link
                href={`/collections/${savedCollectionId}`}
                className="flex-1 order-1 sm:order-2 px-6 py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-medium bg-purple-500 hover:bg-purple-600 text-white transition-colors shadow-lg shadow-purple-500/20 cursor-pointer"
              >
                View {CRAVELIST_LABEL}
              </Link>
            ) : (
              <button
                onClick={handleSave}
                disabled={!name.trim() || isSubmitting}
                className="flex-1 order-1 sm:order-2 px-6 py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-medium bg-purple-500 hover:bg-purple-600 text-white transition-colors shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <span>Save {CRAVELIST_LABEL}</span>
                )}
              </button>
            )}
            <button
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="flex-1 order-2 sm:order-1 px-6 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white bg-black/50 border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Right Column: Media List — scroll container with glass look */}
        <div className="lg:col-span-2 relative rounded-2xl border border-white/20 overflow-y-auto max-h-[calc(100vh-4rem)] bg-linear-to-br from-white/6 via-white/3 to-white/5 backdrop-blur-[32px] backdrop-saturate-150 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.15),0_8px_32px_-4px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 sticky top-0 z-30 rounded-t-2xl border-b border-white/15 bg-white/5 backdrop-blur-xl">
            <div>
              <h2 className="text-lg font-semibold text-white">List Items</h2>
              <p className="text-sm text-zinc-400">
                {items.length} {items.length === 1 ? "item" : "items"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/5 mr-2">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === "list"
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                  }`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <input
                type="file"
                accept=".csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleCSVImport}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="hidden sm:flex text-sm font-medium items-center gap-2 px-4 py-2 rounded-xl bg-black/50 border border-white/10 hover:bg-white/10 text-zinc-300 transition-colors cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                Import CSV
              </button>
              <button
                onClick={() => setIsSearchOpen(true)}
                className="text-sm font-medium flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>
          </div>

          <div className="p-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border-2 border-dashed border-white/10 bg-white/5">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">
                  No items added yet
                </h3>
                <p className="text-zinc-400 text-sm max-w-sm mb-6">
                  Start adding your favorite movies, TV shows, and books to
                  build out your {CRAVELIST_LABEL.toLowerCase()}.
                </p>
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="px-6 py-2.5 rounded-xl bg-black/50 border border-white/10 hover:bg-white/10 text-white font-medium transition-colors cursor-pointer flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-4 h-4" /> Search Media
                </button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items.map((i) => i._localId)}
                  strategy={
                    viewMode === "list"
                      ? verticalListSortingStrategy
                      : rectSortingStrategy
                  }
                >
                  <div
                    className={
                      viewMode === "list"
                        ? "flex flex-col gap-2"
                        : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                    }
                  >
                    {items.map((item, idx) => (
                      <SortableMediaCard
                        key={item._localId}
                        item={item}
                        index={idx}
                        isRanked={isRanked}
                        isListView={viewMode === "list"}
                        onRemove={() => handleRemoveItem(idx)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      <MediaSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelect={handleAddItem}
        onAddClick={handleAddItem}
      />

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </main>
  );
}

export default function CreateCollectionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <CreateCollectionContent />
    </Suspense>
  );
}
