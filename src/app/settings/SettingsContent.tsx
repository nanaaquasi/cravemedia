"use client";

import { signout } from "@/app/auth/actions";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { useLists } from "@/hooks/useLists";

export function SettingsContent() {
  const router = useRouter();
  const { refreshSession } = useSession();
  const { refreshLists } = useLists();

  const handleSignOut = async () => {
    const result = await signout();
    if (result?.error) {
      console.error("Sign out failed:", result.error);
      return;
    }
    router.replace("/");
    router.refresh();
    refreshSession().catch((error) => {
      console.error("Post-signout session refresh failed:", error);
    });
    refreshLists().catch((error) => {
      console.error("Post-signout lists refresh failed:", error);
    });
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-medium transition-colors cursor-pointer"
    >
      <LogOut className="w-4 h-4" />
      Sign out
    </button>
  );
}
