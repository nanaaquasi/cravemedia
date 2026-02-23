"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileNav } from "./ProfileNav";
import { CollectionCard } from "./CollectionCard";
import { EmptyState } from "./EmptyState";
import { StatsBar } from "./StatsBar";
import { CurrentJourney } from "./CurrentJourney";
import { JourneyShowcase } from "./JourneyShowcase";
import { ActivityFeed } from "./ActivityFeed";
import { NoJourneysEmptyState, NoActivityEmptyState } from "./EmptyStates";
import { ProfileDashboardData, subscribeToUserActivity } from "./queries";
import type { Journey } from "./queries";
import { Profile, Collection, CollectionItem } from "@/lib/supabase/types";
import { InProgressMedia } from "./InProgressMedia";
import Link from "next/link";
import { Clock, Plus, LayoutGrid, Loader2, Play, Sparkles } from "lucide-react";
import CreateCollectionModal from "@/components/CreateCollectionModal";
import {
  CRAVELIST_LABEL,
  CRAVELIST_LABEL_PLURAL,
} from "@/config/labels";
import { useLists } from "@/hooks/useLists";
import Toast from "@/components/Toast";

interface AccountViewProps {
  profile: Profile | null;
  email?: string;
  initialCollections: Collection[];
  initialDashboardData: ProfileDashboardData;
  inProgressItems: CollectionItem[];
  featuredJourneys?: Journey[];
  featuredCollections?: (Collection & {
    items?: { image_url: string | null }[];
    item_count?: number;
    curator_first_name?: string | null;
  })[];
  isNewUser?: boolean;
}

export function AccountView({
  profile,
  email,
  initialCollections,
  initialDashboardData,
  inProgressItems,
  featuredJourneys = [],
  featuredCollections = [],
  isNewUser = false,
}: AccountViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Overview");
  const [dashboardData, setDashboardData] =
    useState<ProfileDashboardData>(initialDashboardData);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { createList, refreshLists } = useLists();

  useEffect(() => {
    // We already have initial data from server, but we can refresh if needed
    // or just rely on the server data for the first render.
    // The current implementation blocked render with loading=true.
    // Now we initialize with server data and loading=false.

    // Subscribe to realtime updates
    if (profile?.id) {
      const channel = subscribeToUserActivity(profile.id, (newActivity) => {
        setDashboardData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            recentActivity: [newActivity, ...prev.recentActivity].slice(0, 10),
          };
        });
      });

      return () => {
        channel.unsubscribe();
      };
    }
  }, [profile?.id]);

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  // Combine initial props with fetched data
  const finalStats = {
    followers: dashboardData.followersCount,
    following: dashboardData.followingCount,
  };

  const handleCreateCollection = async ({
    name,
    description,
  }: {
    name: string;
    description: string;
  }) => {
    try {
      const result = await createList(name, description, [], {
        isPublic: false,
        isExplicitlySaved: true,
      });
      if (result) {
        setToastMessage(`Created ${CRAVELIST_LABEL.toLowerCase()} "${name}"`);
        await refreshLists();
        setIsCreateModalOpen(false);
        router.push(`/collections/${result.id}`);
      }
    } catch (e) {
      console.error(e);
      setToastMessage(`Failed to create ${CRAVELIST_LABEL.toLowerCase()}.`);
    }
  };

  return (
    <div className="min-h-screen pb-20 font-sans">
      <div className="max-w-6xl mx-auto mt-6">
        <ProfileHeader profile={profile} email={email} stats={finalStats} isNewUser={isNewUser} />
        <ProfileNav activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="mt-8">
          {/* Overview Tab */}
          {activeTab === "Overview" && dashboardData && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <StatsBar stats={dashboardData.stats} />

              <InProgressMedia items={inProgressItems} />

              {dashboardData.currentJourney ? (
                <CurrentJourney journey={dashboardData.currentJourney} />
              ) : null}

              {/* Your Journeys (Wishlist) */}
              {dashboardData.wishlistJourneys.length > 0 && (
                <JourneyShowcase
                  journeys={dashboardData.wishlistJourneys}
                  title="Your Journeys"
                  onViewAll={() => setActiveTab("Journeys")}
                />
              )}

              {/* Your Cravelists Preview */}
              {initialCollections.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <LayoutGrid className="w-5 h-5 text-purple-400" />
                      Your {CRAVELIST_LABEL_PLURAL}
                    </h2>
                    <button
                      onClick={() => setActiveTab("Collections")}
                      className="text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      View All
                    </button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide md:overflow-visible md:grid md:grid-cols-2 lg:grid-cols-3">
                    {initialCollections.slice(0, 3).map((col) => (
                      <div key={col.id} className="shrink-0 w-72 md:shrink md:w-auto">
                        <CollectionCard collection={col} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* If no current and no saved, show Get Started or empty state */}
              {!dashboardData.currentJourney &&
                dashboardData.wishlistJourneys.length === 0 &&
                (featuredJourneys.length > 0 || featuredCollections.length > 0 ? (
                  <div className="space-y-8">
                    <div className="text-center py-8 px-4 bg-zinc-900/20 rounded-3xl border border-white/5">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center border border-white/5">
                        <Sparkles className="w-8 h-8 text-purple-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">
                        Get Started
                      </h3>
                      <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                        Explore popular journeys and cravings to get inspired
                      </p>
                      {featuredJourneys.length > 0 && (
                        <JourneyShowcase
                          journeys={featuredJourneys}
                          title="Popular Journeys"
                        />
                      )}
                      {featuredCollections.length > 0 && (
                        <div className="mt-8 space-y-4">
                          <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                            <LayoutGrid className="w-5 h-5 text-purple-400" />
                            Featured {CRAVELIST_LABEL_PLURAL}
                          </h2>
                          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide justify-center md:overflow-visible md:grid md:grid-cols-2 lg:grid-cols-3 md:max-w-4xl md:mx-auto">
                            {featuredCollections.map((col, i) => (
                              <div
                                key={col.id}
                                className="shrink-0 w-72 md:shrink md:w-auto"
                              >
                                <CollectionCard
                                  collection={col}
                                  variant="featured"
                                  gradientIndex={i}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-8 flex justify-center">
                        <Link
                          href="/search"
                          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          Create a Journey
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <NoJourneysEmptyState />
                ))}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <JourneyShowcase
                    journeys={dashboardData.completedJourneys}
                    onViewAll={() => setActiveTab("Journeys")}
                  />
                </div>
                <div className="hidden">
                  <ActivityFeed activities={dashboardData.recentActivity} />
                </div>
              </div>
            </div>
          )}

          {/* Journeys Tab */}
          {activeTab === "Journeys" && dashboardData && (
            <div className="space-y-8">
              {dashboardData.currentJourney && (
                <CurrentJourney journey={dashboardData.currentJourney} />
              )}

              {dashboardData.wishlistJourneys.length > 0 && (
                <JourneyShowcase
                  journeys={dashboardData.wishlistJourneys}
                  title="Your Journeys"
                  onViewAll={() => setActiveTab("Journeys")}
                />
              )}

              {dashboardData.completedJourneys.length > 0 && (
                <JourneyShowcase
                  journeys={dashboardData.completedJourneys}
                  onViewAll={() => setActiveTab("Journeys")}
                />
              )}

              {!dashboardData.currentJourney &&
                dashboardData.wishlistJourneys.length === 0 &&
                dashboardData.completedJourneys.length === 0 &&
                (featuredJourneys.length > 0 || featuredCollections.length > 0 ? (
                  <div className="space-y-8">
                    <div className="text-center py-8 px-4 bg-zinc-900/20 rounded-3xl border border-white/5">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center border border-white/5">
                        <Sparkles className="w-8 h-8 text-purple-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">
                        Get Started
                      </h3>
                      <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                        Explore popular journeys and cravings to get inspired
                      </p>
                      {featuredJourneys.length > 0 && (
                        <JourneyShowcase
                          journeys={featuredJourneys}
                          title="Popular Journeys"
                        />
                      )}
                      {featuredCollections.length > 0 && (
                        <div className="mt-8 space-y-4">
                          <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                            <LayoutGrid className="w-5 h-5 text-purple-400" />
                            Featured {CRAVELIST_LABEL_PLURAL}
                          </h2>
                          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide justify-center md:overflow-visible md:grid md:grid-cols-2 lg:grid-cols-3 md:max-w-4xl md:mx-auto">
                            {featuredCollections.map((col, i) => (
                              <div
                                key={col.id}
                                className="shrink-0 w-72 md:shrink md:w-auto"
                              >
                                <CollectionCard
                                  collection={col}
                                  variant="featured"
                                  gradientIndex={i}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-8 flex justify-center">
                        <Link
                          href="/search"
                          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          Create a Journey
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <NoJourneysEmptyState />
                ))}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "Activity" && dashboardData && (
            <div className="max-w-2xl mx-auto hidden">
              <h2 className="text-xl font-bold text-white mb-6">
                Activity Feed
              </h2>
              {dashboardData.recentActivity.length > 0 ? (
                <ActivityFeed activities={dashboardData.recentActivity} />
              ) : (
                <NoActivityEmptyState />
              )}
            </div>
          )}

          {/* Stats Tab (Reusing StatsBar for now, could be more detailed) */}
          {activeTab === "Stats" && dashboardData && (
            <div className="space-y-8">
              <h2 className="text-xl font-bold text-white mb-6">
                Your Statistics
              </h2>
              <StatsBar stats={dashboardData.stats} />
              {/* Add more charts here later */}
            </div>
          )}

          {/* Cravelists Tab */}
          {activeTab === "Collections" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">My {CRAVELIST_LABEL_PLURAL}</h2>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-medium text-sm hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New {CRAVELIST_LABEL}
                </button>
              </div>
              <p className="text-zinc-500 text-sm -mt-4 mb-8">
                Organise and manage your custom {CRAVELIST_LABEL_PLURAL.toLowerCase()} here.
              </p>

              {initialCollections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {initialCollections.map((col) => (
                    <CollectionCard key={col.id} collection={col} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={LayoutGrid}
                  title={`No ${CRAVELIST_LABEL_PLURAL.toLowerCase()} yet`}
                  description={`Create your first ${CRAVELIST_LABEL.toLowerCase()} to start organizing your favorite media.`}
                />
              )}
            </div>
          )}

          {/* WatchList Tab */}
          {activeTab === "WatchList" && (
            <EmptyState
              icon={Clock}
              title="Your watchlist is empty..."
              description="Movies you add to your watchlist will appear here"
            />
          )}
        </div>
      </div>

      <CreateCollectionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onConfirm={handleCreateCollection}
      />
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
