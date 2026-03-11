"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Sparkles, Calendar, User } from "lucide-react";
import { useSession } from "@/context/SessionContext";

const tabs = [
  { href: "/", label: "Ask Craveo", icon: Sparkles },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export default function MobileTabBar() {
  const pathname = usePathname();
  const { user, isLoading } = useSession();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden
        bg-white/[0.06] backdrop-blur-2xl
        border-t border-white/10
        shadow-[0_-4px_24px_rgba(0,0,0,0.2)]"
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          const isProfile = href === "/profile";
          const profileHref = isProfile ? (user ? "/profile" : "/login") : href;
          const profileLabel = isLoading ? "..." : isProfile && !user ? "Sign in" : label;

          return (
            <Link
              key={href}
              href={profileHref}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-2 min-w-0 active:scale-95 transition-transform"
              aria-label={isProfile && !user && !isLoading ? "Sign in" : label}
            >
              <Icon
                className={`w-6 h-6 ${
                  isActive ? "text-purple-400" : "text-white/50"
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-[12px] font-medium ${
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
