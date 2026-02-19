"use client";
import { signout } from "@/app/auth/actions";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signout()}
      className="flex items-center gap-2 bg-black/50 hover:bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-all"
    >
      <LogOut className="w-3 h-3" />
      Sign Out
    </button>
  );
}
