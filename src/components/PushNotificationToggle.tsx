"use client";

import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useSession } from "@/context/SessionContext";
import { Bell, BellOff, Loader2 } from "lucide-react";

export function PushNotificationToggle() {
  const { user } = useSession();
  const {
    isSupported,
    isSubscribed,
    isLoading,
    subscribeToPush,
    unsubscribeFromPush,
  } = usePushNotifications(user);

  if (!isSupported) {
    return (
      <div className="text-sm text-[var(--text-muted)] bg-white/5 p-4 rounded-xl border border-white/5">
        Push notifications are not supported on this device/browser. Install the app or use a modern browser!
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
      <div>
        <p className="font-semibold text-[var(--text-primary)]">Release Notifications</p>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Get notified when new episodes air or items drop.
        </p>
      </div>

      <div className="flex gap-2">
        {isSubscribed && (
          <button
            type="button"
            onClick={async () => {
              const res = await fetch("/api/test-push", {
                method: "POST",
                body: JSON.stringify({
                  title: "It Works!",
                  body: "Craveo push notifications are active.",
                }),
              });
              if (!res.ok) alert("Test push failed");
            }}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer bg-white/5 hover:bg-white/10 text-white"
          >
            Test
          </button>
        )}
        <button
          type="button"
          disabled={isLoading}
          onClick={() => {
            if (isSubscribed) {
              unsubscribeFromPush();
            } else {
              subscribeToPush();
            }
          }}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
            isSubscribed
              ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30"
              : "liquid-glass-strong text-white hover:bg-white/10"
          } ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSubscribed ? (
            <>
              <Bell className="w-4 h-4" />
              Enabled
            </>
          ) : (
            <>
              <BellOff className="w-4 h-4 text-white/50" />
              Enable
            </>
          )}
        </button>
      </div>
    </div>
  );
}
