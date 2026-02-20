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
import { Profile, Collection, CollectionItem } from "@/lib/supabase/types";
import { InProgressMedia } from "./InProgressMedia";
import { Clock, Plus, LayoutGrid, Loader2 } from "lucide-react";
import CreateCollectionModal from "@/components/CreateCollectionModal";
import { useLists } from "@/hooks/useLists";
import Toast from "@/components/Toast";

interface AccountViewProps {
  profile: Profile | null;
  email?: string;
  initialCollections: Collection[];
  initialDashboardData: ProfileDashboardData;
  inProgressItems: CollectionItem[];
}

export function AccountView({
  profile,
  email,
  initialCollections,
  initialDashboardData,
  inProgressItems,
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
        setToastMessage(`Created collection "${name}"`);
        await refreshLists();
        setIsCreateModalOpen(false);
        router.push(`/collections/${result.id}`);
      }
    } catch (e) {
      console.error(e);
      setToastMessage("Failed to create collection.");
    }
  };

  return (
    <div className="min-h-screen pb-20 font-sans">
      <div className="max-w-6xl mx-auto mt-6">
        <ProfileHeader profile={profile} email={email} stats={finalStats} />
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

              {/* Saved Journeys (Wishlist) */}
              {dashboardData.wishlistJourneys.length > 0 && (
                <JourneyShowcase
                  journeys={dashboardData.wishlistJourneys}
                  title="Saved Journeys"
                />
              )}

              {/* Saved Collections Preview */}
              {initialCollections.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <LayoutGrid className="w-5 h-5 text-purple-400" />
                      Saved Collections
                    </h2>
                    <button
                      onClick={() => setActiveTab("Collections")}
                      className="text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      View All
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {initialCollections.slice(0, 3).map((col) => (
                      <CollectionCard key={col.id} collection={col} />
                    ))}
                  </div>
                </div>
              )}

              {/* If no current and no saved, show empty state */}
              {!dashboardData.currentJourney &&
                dashboardData.wishlistJourneys.length === 0 && (
                  <NoJourneysEmptyState />
                )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <JourneyShowcase journeys={dashboardData.completedJourneys} />
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
                  title="Saved Journeys"
                />
              )}

              {dashboardData.completedJourneys.length > 0 && (
                <JourneyShowcase journeys={dashboardData.completedJourneys} />
              )}

              {!dashboardData.currentJourney &&
                dashboardData.wishlistJourneys.length === 0 &&
                dashboardData.completedJourneys.length === 0 && (
                  <NoJourneysEmptyState />
                )}
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

          {/* Collections Tab */}
          {activeTab === "Collections" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">My Collections</h2>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-medium text-sm hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Collection
                </button>
              </div>
              <p className="text-zinc-500 text-sm -mt-4 mb-8">
                Organise and manage your custom collections here.
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
                  title="No collections yet"
                  description="Create your first collection to start organizing your favorite media."
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
