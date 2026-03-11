import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { SettingsContent } from "./SettingsContent";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex-1 flex flex-col pb-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-zinc-400">
          Manage your account and preferences
        </p>
      </div>

      <div className="space-y-8 max-w-2xl">
        <section className="liquid-glass rounded-2xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Account
          </h2>
          <div className="space-y-2">
            <p className="text-sm text-zinc-400">Email</p>
            <p className="text-white font-medium">{user.email}</p>
          </div>
          <Link
            href="/profile"
            className="inline-block mt-4 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            View profile
          </Link>
        </section>

        <section className="liquid-glass rounded-2xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Sign out
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            Sign out of your account on this device.
          </p>
          <SettingsContent />
        </section>
      </div>
    </main>
  );
}
