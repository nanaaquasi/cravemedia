import { getDiscoverCollections, getDiscoverJourneys } from "@/lib/discover";
import { getTrendingMedia } from "@/lib/discover-trending";
import { DiscoverHeader } from "@/components/discover/DiscoverHeader";
import { TrendingMedia } from "@/components/discover/TrendingMedia";
import { TrendingSection } from "@/components/discover/TrendingSection";
import { BrowseByMood } from "@/components/discover/BrowseByMood";
import { JoinCraveo } from "@/components/discover/JoinCraveo";
import { JourneyShowcase } from "@/components/account/JourneyShowcase";
import { SiteFooter } from "@/components/SiteFooter";
import { Collection } from "@/lib/supabase/types";
import type { Journey } from "@/components/account/queries";

export default async function DiscoverPage() {
  const [collections, journeys, trendingData] = await Promise.all([
    getDiscoverCollections(12),
    getDiscoverJourneys(12),
    getTrendingMedia(),
  ]);

  const formattedCollections = collections as unknown as (Collection & {
    items?: { image_url: string | null }[];
    item_count?: number;
    curator_first_name?: string | null;
    favorites_count?: number;
    views_count?: number;
    saves_count?: number;
  })[];

  const formattedJourneys = journeys as unknown as Journey[];

  return (
    <main className="flex-1 flex flex-col pb-16">
      <DiscoverHeader />

      <TrendingMedia
        trending={trendingData.trending}
        popular={trendingData.popular}
        trendingAnime={trendingData.trendingAnime}
        popularAnime={trendingData.popularAnime}
      />

      <TrendingSection collections={formattedCollections} />

      <section className="mb-12">
        <JourneyShowcase
          journeys={formattedJourneys}
          title="Featured Journeys"
          description="Curated sequences where each pick leads to the next—follow a path through movies, shows, or music with smooth transitions and a clear narrative arc."
        />
      </section>

      <BrowseByMood />

      <JoinCraveo />

      <SiteFooter />
    </main>
  );
}
