import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SavedList, EnrichedRecommendation, JourneyItem } from "@/lib/types";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ lists: [] });
    }

    // 1. Fetch Collections
    const { data: collections } = await supabase
      .from("collections")
      .select("*, collection_items(*)")
      .eq("user_id", user.id)
      .eq("is_explicitly_saved", true)
      .order("created_at", { ascending: false });

    // 2. Fetch Journeys (New Table)
    // We want all journeys, regardless of status, or maybe just wishlist/in_progress?
    // The side sheet usually shows "Saved Cravings", so likely all of them.
    const { data: journeys } = await supabase
      .from("journeys")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_explicitly_saved", true)
      .order("created_at", { ascending: false });

    // 3. Map Collections to SavedList
    const mappedCollections: SavedList[] =
      collections?.map((c) => ({
        id: c.id,
        name: c.name,
        description: "Collection",
        items: c.collection_items.map((i: any) => ({
          ...i.metadata,
          title: i.title || i.metadata?.title || "Untitled",
          posterUrl: i.image_url || i.metadata?.posterUrl,
          type: i.media_type || i.metadata?.type || "movie",
          collectionItemId: i.id,
        })) as EnrichedRecommendation[],
        createdAt: c.created_at,
        updatedAt: c.created_at,
        isPublic: c.is_public ?? false,
        isJourney: false,
      })) || [];

    // 4. Map Journeys to SavedList
    const mappedJourneys: SavedList[] =
      journeys?.map((j) => {
        // j.items is jsonb, we need to cast it
        const items = (j.items as unknown as JourneyItem[]) || [];

        // Map JourneyItem to EnrichedRecommendation
        // JourneyItem extends EnrichedRecommendation, so it should be mostly compatible
        // But we explicitly map to ensure fields match what SavedListsPanel expects
        const listItems: EnrichedRecommendation[] = items.map((item) => ({
          title: item.title,
          creator: item.creator,
          year: item.year,
          type: item.type,
          description: item.description,
          genres: item.genres,
          posterUrl: item.posterUrl,
          rating: item.rating,
          ratingSource: item.ratingSource,
          runtime: item.runtime,
          externalId: item.externalId,
        }));

        return {
          id: j.id,
          name: j.title,
          description: j.description || "",
          items: listItems,
          createdAt: j.created_at,
          updatedAt: j.updated_at || j.created_at,
          isPublic: j.is_public ?? false,
          isJourney: true,
          journeyMetadata: items.map((item) => ({
            position: item.position,
            whyThisPosition: item.whyThisPosition,
            whatYoullLearn: item.whatYoullLearn,
            transitionToNext: item.transitionToNext,
            difficultyLevel: item.difficultyLevel,
          })),
        };
      }) || [];

    // 5. Combine and Sort
    const allLists = [...mappedJourneys, ...mappedCollections].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return NextResponse.json({ lists: allLists });
  } catch (error) {
    console.error("Error fetching lists:", error);
    return NextResponse.json(
      { error: "Failed to fetch lists" },
      { status: 500 },
    );
  }
}
