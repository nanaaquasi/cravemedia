"use client";

import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, Settings, LogOut, ChevronRight, Bell } from "lucide-react";
import Link from "next/link";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";

export default function MenuPage() {
  const { user } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!user) {
    return (
      <main className="flex-1 p-4 md:p-8 max-w-lg mx-auto w-full pt-20 md:pt-8 min-h-screen">
        <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">Menu</h1>
        <div className="liquid-glass rounded-2xl p-6 text-center border border-white/10">
          <p className="text-zinc-400 mb-6 font-medium">Have an account?</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-4 md:p-8 max-w-lg mx-auto w-full pt-20 md:pt-8 rounded-3xl min-h-screen pwa-safe-area-main pb-24">
      <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">Menu</h1>

      <div className="space-y-4">
        <Link
          href="/profile"
          className="flex items-center justify-between p-4 rounded-2xl liquid-glass border border-white/10 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Your Profile</p>
              <p className="text-xs text-zinc-400">View your media diet & stats</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/30" />
        </Link>

        <Link
          href="/settings"
          className="flex items-center justify-between p-4 rounded-2xl liquid-glass border border-white/10 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-500/20 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Settings</p>
              <p className="text-xs text-zinc-400">Manage account & imports</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/30" />
        </Link>

        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider pl-2 mt-8">
            Notifications
          </h2>
          <PushNotificationToggle />
        </div>

        <div className="pt-8">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-red-500/20 hover:bg-red-500/10 text-red-400 font-semibold active:scale-[0.98] transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
