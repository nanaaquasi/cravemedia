import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:craveo@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const TMDB_API_KEY = process.env.TMDB_API_KEY;

export async function GET(request: Request) {
  // Validate authorization
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Ensure Service Key is present
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new NextResponse(
      "Missing SUPABASE_SERVICE_ROLE_KEY in environment variables. Required to bypass RLS for Cron Jobs.",
      { status: 500 }
    );
  }

  try {
    // 1. Fetch TV shows airing today from TMDB
    let airingTvIds: number[] = [];
    const tvRes = await fetch(
      `https://api.themoviedb.org/3/tv/airing_today?api_key=${TMDB_API_KEY}&language=en-US&page=1`
    );
    if (tvRes.ok) {
      const tvData = await tvRes.json();
      airingTvIds = tvData.results.map((r: any) => r.id);
    }

    // 2. Fetch Movies releasing recently
    let newMovieIds: number[] = [];
    const movieRes = await fetch(
      `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&language=en-US&page=1`
    );
    if (movieRes.ok) {
      const movieData = await movieRes.json();
      newMovieIds = movieData.results.map((r: any) => r.id);
    }

    const allMediaIds = [...airingTvIds.map(String), ...newMovieIds.map(String)];

    if (allMediaIds.length === 0) {
      return NextResponse.json({ message: "No new releases today." });
    }

    // 3. Query all collection_items matching these IDs and INNER JOIN collections to get user_id
    const { data: matchedItems, error: itemsError } = await supabase
      .from("collection_items")
      .select(`
        media_id,
        media_type,
        title,
        collections!inner (
          user_id
        )
      `)
      .in("media_id", allMediaIds);

    if (itemsError) throw itemsError;
    if (!matchedItems || matchedItems.length === 0) {
      return NextResponse.json({ message: "No users tracking today's releases." });
    }

    // Map matched items by user_id
    const userMap: Record<string, typeof matchedItems[0][]> = {};
    for (const item of matchedItems) {
      const colls = item.collections as unknown as { user_id: string } | { user_id: string }[];
      const userId = Array.isArray(colls) ? colls[0]?.user_id : colls?.user_id;

      if (!userId) continue;
      
      if (!userMap[userId]) userMap[userId] = [];
      if (!userMap[userId].find((i) => i.media_id === item.media_id)) {
        userMap[userId].push(item);
      }
    }

    const userIds = Object.keys(userMap);
    if (userIds.length === 0) {
      return NextResponse.json({ message: "No users tracking today's releases." });
    }

    // 4. Fetch Push Subscriptions for these users
    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (subsError) throw subsError;
    if (!subs || subs.length === 0) {
      return NextResponse.json({ message: "Target users do not have push enabled." });
    }

    // 5. Fire off push notifications
    let pushCount = 0;
    const errors: any[] = [];

    for (const sub of subs) {
      const itemsForThisUser = userMap[sub.user_id];
      if (!itemsForThisUser || itemsForThisUser.length === 0) continue;

      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      } as webpush.PushSubscription;

      for (const item of itemsForThisUser) {
        const typeStr = item.media_type === "tv" ? "New Episode" : "Now Playing";
        const payload = JSON.stringify({
          title: `🍿 ${typeStr}: ${item.title}`,
          body: `Drop what you're doing. It's time to watch!`,
          url: `/media/${item.media_type}/${item.media_id}`,
        });

        try {
          await webpush.sendNotification(subscription, payload);
          pushCount++;
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
             // Subscription expired or unsubscribed, remove it
             await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          } else {
             errors.push(error.message || error.toString());
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      pushCount, 
      errors: errors.length > 0 ? errors : undefined 
    });

  } catch (error: any) {
    console.error("Cron Job Error:", error);
    return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
  }
}
