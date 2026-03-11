"use client";

import { useState } from "react";
import { Profile } from "@/lib/supabase/types";
import { ProfileHeader } from "@/components/account/ProfileHeader";
import { StatsBar } from "@/components/account/StatsBar";
import { FavoriteHighlights } from "@/components/account/FavoriteHighlights";
import { RecentlyFinished } from "@/components/account/RecentlyFinished";
import { RecentlyReviewed } from "@/components/account/RecentlyReviewed";
import { ActivityFeed } from "@/components/account/ActivityFeed";
import { FavoritesTab } from "@/components/account/FavoritesTab";
import { CollectionCard } from "@/components/account/CollectionCard";
import { JourneyShowcase } from "@/components/account/JourneyShowcase";
import { ProfileNav } from "@/components/account/ProfileNav";
import type { Activity } from "@/components/account/queries";
import type { Journey } from "@/components/account/queries";
import type { UserStats } from "@/components/account/queries";
import { LayoutGrid } from "lucide-react";
import { CRAVELIST_LABEL_PLURAL } from "@/config/labels";
import type { Collection } from "@/lib/supabase/types";

interface PublicProfileViewProps {
  profile: Profile | null;
  stats: UserStats | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  favorites: Array<{
    id: string;
    target_type: string;
    target_id: string;
    title: string | null;
    image_url: string | null;
    metadata: Record<string, unknown>;
  }>;
  recentActivity: Activity[];
  collections: Array<Record<string, unknown> & {
    id: string;
    name: string;
    items?: { image_url: string | null }[];
    item_count?: number;
  }>;
  journeys: Journey[];
  recentlyFinished: Array<{
    id: string;
    media_id: string;
    media_type: string;
    title: string | null;
    image_url: string | null;
    finished_at: string | null;
    item_rating: number | null;
  }>;
  recentlyReviewed: Array<{
    id: string;
    media_id: string;
    media_type: string;
    title: string | null;
    image_url: string | null;
    item_rating: number | null;
    created_at: string | null;
  }>;
}

export function PublicProfileView({
  profile,
  stats,
  followersCount: initialFollowersCount,
  followingCount,
  isFollowing,
  recentActivity,
  collections,
  journeys,
  recentlyFinished,
  recentlyReviewed,
}: PublicProfileViewProps) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);

  const displayStats = stats ?? {
    user_id: profile?.id ?? "",
    total_journeys_completed: 0,
    total_journeys_in_progress: 0,
    total_items_watched: 0,
    total_hours_watched: 0,
    current_streak_days: 0,
    longest_streak_days: 0,
    journey_completion_rate: 0,
    total_badges_unlocked: 0,
    average_journey_rating: 0,
    average_item_rating: 0,
    top_genres: [],
    last_activity_date: null,
    updated_at: null,
    total_favorites: 0,
  };

  return (
    <div className="min-h-screen pb-20 font-sans">
      <div className="max-w-7xl mx-auto mt-6">
        <ProfileHeader
          profile={profile}
          stats={{ followers: followersCount, following: followingCount }}
          isPublicProfile
          isFollowing={isFollowing}
          onFollowChange={(_, newCount) => setFollowersCount(newCount)}
        />
        <ProfileNav activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="mt-8">
          {activeTab === "Overview" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <StatsBar stats={displayStats} />
              {profile?.id && <FavoriteHighlights userId={profile.id} />}
              <RecentlyFinished items={recentlyFinished} />
              <RecentlyReviewed items={recentlyReviewed} />

              {collections.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-purple-400" />
                    {CRAVELIST_LABEL_PLURAL}
                  </h2>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide md:overflow-visible md:grid md:grid-cols-2 lg:grid-cols-3">
                    {collections.slice(0, 6).map((col) => (
                      <div key={col.id} className="shrink-0 w-72 md:shrink md:w-auto">
                        <CollectionCard
                          collection={col as unknown as Collection & { items?: { image_url: string | null }[]; item_count?: number }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {journeys.length > 0 && (
                <JourneyShowcase journeys={journeys} title="Journeys" />
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2" />
                <div>
                  <ActivityFeed
                    activities={recentActivity}
                    limit={5}
                    onViewAll={() => setActiveTab("Activity")}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "Activity" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ActivityFeed activities={recentActivity} />
              {recentActivity.length === 0 && (
                <div className="text-center py-16 px-4 bg-zinc-900/20 rounded-3xl border border-white/5">
                  <p className="text-zinc-500">No activity yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "Favorites" && profile?.id && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <FavoritesTab userId={profile.id} />
            </div>
          )}

          {activeTab === "Journeys" && (
            <div className="space-y-8">
              {journeys.length > 0 ? (
                <JourneyShowcase journeys={journeys} title="Journeys" />
              ) : (
                <p className="text-zinc-500 text-center py-12">
                  No public journeys yet
                </p>
              )}
            </div>
          )}

          {activeTab === "Collections" && (
            <div className="space-y-8">
              {collections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {collections.map((col) => (
                    <CollectionCard
                      key={col.id}
                      collection={col as unknown as Collection & { items?: { image_url: string | null }[]; item_count?: number }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 text-center py-12">
                  No public {CRAVELIST_LABEL_PLURAL.toLowerCase()} yet
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
