"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookMarked, User, LayoutGrid } from "lucide-react";
import { useSession } from "@/context/SessionContext";

interface MobileBottomNavProps {
  onOpenLists: () => void;
  listsCount: number;
}

export default function MobileBottomNav({
  onOpenLists,
  listsCount,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const { user } = useSession();

  const isHome = pathname === "/";
  const isProfile = pathname === "/account" || pathname === "/login";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden
        bg-white/[0.06] backdrop-blur-2xl
        border-t border-white/10
        shadow-[0_-4px_24px_rgba(0,0,0,0.2)]"
    >
      <div className="flex items-center justify-around h-16">
        {/** Home */}
        <Link
          href="/"
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2 min-w-0 active:scale-95 transition-transform"
          aria-label="Home"
        >
          <Home
            className={`w-6 h-6 ${
              isHome ? "text-purple-400" : "text-white/50"
            }`}
            strokeWidth={isHome ? 2.5 : 2}
          />
          <span
            className={`text-[12px] font-medium ${
              isHome ? "text-purple-400" : "text-white/50"
            }`}
          >
            Home
          </span>
        </Link>

        {/** Lists */}
        <button
          type="button"
          onClick={onOpenLists}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2 min-w-0 active:scale-95 transition-transform"
          aria-label="My Lists"
        >
          <div className="relative">
            <LayoutGrid className="w-6 h-6 text-white/50" strokeWidth={2} />
            {listsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-1 rounded-full bg-purple-500 text-[10px] font-bold flex items-center justify-center">
                {listsCount > 99 ? "99+" : listsCount}
              </span>
            )}
          </div>
          <span className="text-[12px] font-medium text-white/50">Lists</span>
        </button>

        {/** Profile */}
        <Link
          href={user ? "/account" : "/login"}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2 min-w-0 active:scale-95 transition-transform"
          aria-label={user ? "Profile" : "Sign in"}
        >
          <User
            className={`w-6 h-6 ${
              isProfile ? "text-purple-400" : "text-white/50"
            }`}
            strokeWidth={isProfile ? 2.5 : 2}
          />
          <span
            className={`text-[12px] font-medium ${
              isProfile ? "text-purple-400" : "text-white/50"
            }`}
          >
            {user ? "Profile" : "Sign in"}
          </span>
        </Link>
      </div>
    </nav>
  );
}
