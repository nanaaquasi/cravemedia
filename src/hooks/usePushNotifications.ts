import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SessionUser } from "@/app/api/auth/session/route";

// Utility to convert Base64 string to Uint8Array for the VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(user?: SessionUser | null) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    ) {
      setIsSupported(true);
      checkSubscription();
    } else {
      setIsLoading(false);
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking push subscription:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToPush = async () => {
    if (!user) {
      alert("You need to be logged in to enable push notifications.");
      return false;
    }

    setIsLoading(true);

    try {
      // 1. Request Permission
      const permission = await window.Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permission not granted for Notification");
      }

      // 2. Subscribe using VAPID key
      const registration = await navigator.serviceWorker.ready;
      
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        throw new Error("VAPID public key not found in environment.");
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      // 3. Extract keys for Web Push
      const subscriptionJson = subscription.toJSON();
      if (!subscriptionJson.keys) throw new Error("Missing keys in subscription");

      const endpoint = subscriptionJson.endpoint;
      const p256dh = subscriptionJson.keys.p256dh;
      const auth = subscriptionJson.keys.auth;

      if (!endpoint || !p256dh || !auth) {
        throw new Error("Invalid subscription object");
      }

      // 4. Save to Supabase
      const supabase = createClient();
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: endpoint,
          p256dh: p256dh,
          auth: auth,
        },
        { onConflict: "user_id, endpoint" }
      );

      if (error) {
        console.error("Failed to save subscription to Supabase:", error);
        throw error;
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("Failed to subscribe to push notifications:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // 1. Delete from Supabase
        const supabase = createClient();
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);

        // 2. Unsubscribe from browser
        await subscription.unsubscribe();
        setIsSubscribed(false);
      }
      return true;
    } catch (err) {
      console.error("Failed to unsubscribe:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribeToPush,
    unsubscribeFromPush,
  };
}
