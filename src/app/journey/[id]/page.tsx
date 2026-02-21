import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import JourneyDetailClient from "./JourneyDetailClient";
import { JourneyResponse, JourneyItem } from "@/lib/types";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: journey } = await supabase
    .from("journeys")
    .select("title, description, items, is_public")
    .eq("id", id)
    .single();

  if (!journey) return {};

  const items = (journey.items as unknown as JourneyItem[]) || [];
  const posters = items
    .slice(0, 3)
    .map((i) => i.posterUrl)
    .filter(Boolean);

  const ogParams = new URLSearchParams();
  ogParams.set("title", journey.title);
  ogParams.set("type", "Journey");
  if (posters.length > 0) {
    ogParams.set("posters", posters.join(","));
  }

  const ogImage = {
    url: `/api/og?${ogParams.toString()}`,
    width: 1200,
    height: 630,
    alt: journey.title,
  };

  return {
    title: `${journey.title} - Cravemedia Journey`,
    description:
      journey.description || "A personalized media journey on Cravemedia",
    openGraph: {
      title: journey.title,
      description:
        journey.description || "A personalized media journey on Cravemedia",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: journey.title,
      description:
        journey.description || "A personalized media journey on Cravemedia",
      images: [ogImage],
    },
  };
}

export default async function JourneyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // We do not redirect to login immediately because they might be viewing a public journey.

  const { data: journey, error } = await supabase
    .from("journeys")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !journey) {
    notFound();
  }

  const isOwner = user ? journey.user_id === user.id : false;
  const isPublic = journey.is_public === true;

  // Fetch journey_progress for owner (to show completed/current state + reviews)
  let initialProgress: {
    completed: number[];
    currentPosition: number;
    itemReviews: Record<
      number,
      { item_rating: number | null; review_text: string | null }
    >;
  } | null = null;
  if (isOwner && user) {
    const { data: progressRows } = await supabase
      .from("journey_progress")
      .select("item_position, status, item_rating, review_text")
      .eq("journey_id", id)
      .eq("user_id", user.id);
    if (progressRows && progressRows.length > 0) {
      const completed = progressRows
        .filter((r) => r.status === "completed")
        .map((r) => r.item_position);
      const currentRow = progressRows.find((r) => r.status === "current");
      const currentPosition =
        currentRow?.item_position ??
        journey.current_position ??
        (completed.length > 0 ? Math.max(...completed) + 1 : 1);
      const itemReviews: Record<
        number,
        { item_rating: number | null; review_text: string | null }
      > = {};
      for (const r of progressRows) {
        if (r.status === "completed") {
          itemReviews[r.item_position] = {
            item_rating: r.item_rating ?? null,
            review_text: r.review_text ?? null,
          };
        }
      }
      initialProgress = { completed, currentPosition, itemReviews };
    }
  }

  // Ensure user owns the journey or it is public
  if (!isOwner && !isPublic) {
    if (!user) {
      // If it's private and they're not logged in, prompt login
      redirect("/login");
    }
    // If they are logged in but it's someone else's private journey
    notFound();
  }

  // Map database journey to JourneyResponse
  const journeyResponse: JourneyResponse = {
    journeyTitle: journey.title,
    description: journey.description || "",
    totalRuntimeMinutes: journey.total_runtime_minutes || undefined,
    difficultyProgression: journey.difficulty_progression || "",
    items: (journey.items as unknown as JourneyItem[]) || [],
    itemCount: journey.total_items || 0,
  };

  const journeyReviewData =
    journey.status === "completed"
      ? {
          overallRating: journey.overall_rating ?? null,
          sequenceRating: journey.sequence_rating ?? null,
          reviewText:
            (journey as { review_text?: string | null }).review_text ?? null,
        }
      : null;

  return (
    <JourneyDetailClient
      journey={journeyResponse}
      journeyId={id}
      isOwner={isOwner}
      isPublic={isPublic}
      user={user}
      initialProgress={initialProgress}
      journeyStatus={journey.status}
      journeyReviewData={journeyReviewData}
    />
  );
}
