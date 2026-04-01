"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookMarked, Compass, Sparkles, Calendar, User } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { CRAVELIST_LABEL } from "@/config/labels";

const tabs = [
  { href: "/", label: "Ask Craveo", icon: Sparkles },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/profile", label: "Profile", icon: User },
] as const;

const LISTS_LOGIN_NEXT = "/?openSavedLists=1";

interface MobileTabBarProps {
  onOpenSavedLists: () => void;
  listsCount?: number;
}

export default function MobileTabBar({
  onOpenSavedLists,
  listsCount = 0,
}: MobileTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useSession();

  const listsActive =
    pathname === "/collections" || pathname.startsWith("/collections/");

  const cravelistLabel = `My ${CRAVELIST_LABEL}`;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden
        bg-white/[0.06] backdrop-blur-2xl
        border-t border-white/10
        shadow-[0_-4px_24px_rgba(0,0,0,0.2)]"
    >
      <div className="flex items-center justify-around h-16">
        {tabs.slice(0, 2).map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-2 min-w-0 active:scale-95 transition-transform cursor-pointer"
              aria-label={label}
            >
              <Icon
                className={`w-6 h-6 ${
                  isActive ? "text-purple-400" : "text-white/50"
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-[11px] font-medium leading-tight text-center px-0.5 ${
                  isActive ? "text-purple-400" : "text-white/50"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => {
            if (user) {
              onOpenSavedLists();
            } else {
              router.push(
                `/login?next=${encodeURIComponent(LISTS_LOGIN_NEXT)}`,
              );
            }
          }}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2 min-w-0 active:scale-95 transition-transform cursor-pointer"
          aria-label={cravelistLabel}
        >
          <span className="relative inline-flex">
            <BookMarked
              className={`w-6 h-6 ${
                listsActive ? "text-purple-400" : "text-white/50"
              }`}
              strokeWidth={listsActive ? 2.5 : 2}
            />
            {listsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-purple-500 text-[9px] font-bold flex items-center justify-center text-white">
                {listsCount > 99 ? "99+" : listsCount}
              </span>
            )}
          </span>
          <span
            className={`text-[11px] font-medium leading-tight text-center px-0.5 ${
              listsActive ? "text-purple-400" : "text-white/50"
            }`}
          >
            {cravelistLabel}
          </span>
        </button>

        {tabs.slice(2).map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(`${href}/`);
          const isProfile = href === "/profile";
          const profileHref = isProfile ? (user ? "/profile" : "/login") : href;
          const profileLabel =
            isLoading ? "..." : isProfile && !user ? "Sign in" : label;

          return (
            <Link
              key={href}
              href={profileHref}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-2 min-w-0 active:scale-95 transition-transform cursor-pointer"
              aria-label={isProfile && !user && !isLoading ? "Sign in" : label}
            >
              <Icon
                className={`w-6 h-6 ${
                  isActive ? "text-purple-400" : "text-white/50"
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-[11px] font-medium leading-tight text-center px-0.5 ${
                  isActive ? "text-purple-400" : "text-white/50"
                }`}
              >
                {profileLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
