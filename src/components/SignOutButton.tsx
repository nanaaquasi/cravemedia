"use client";
import { signout } from "@/app/auth/actions";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { useLists } from "@/hooks/useLists";

export function SignOutButton() {
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
      className="flex items-center gap-2 bg-black/50 hover:bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-all"
    >
      <LogOut className="w-3 h-3" />
      Sign Out
    </button>
  );
}
