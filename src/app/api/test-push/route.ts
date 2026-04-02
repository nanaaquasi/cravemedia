import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import webpush from "web-push";

// Initialize web-push with VAPID keys
webpush.setVapidDetails(
  "mailto:test@craveo.app", // Use a real email in production
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, body, url } = await request.json();

    // Fetch the user's push subscriptions
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user.id);

    if (error || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { error: "No push subscriptions found for user" },
        { status: 404 }
      );
    }

    const payload = JSON.stringify({
      title: title || "Craveo Test",
      body: body || "This is a test notification from Craveo!",
      url: url || "/",
    });

    // Send push to all active subscriptions for this user
    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        return { success: true };
      } catch (err: any) {
        console.error("Error sending push to subscription:", sub.id, err);
        // If subscription is gone (410), delete it from DB
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
        return { success: false, error: err };
      }
    });

    const results = await Promise.all(sendPromises);

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error("Test push error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
