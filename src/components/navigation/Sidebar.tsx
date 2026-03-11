"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Sparkles,
  Calendar,
  User,
  Settings,
  BookMarked,
} from "lucide-react";
import { CravelistsSignInCard } from "@/components/CravelistsSignInCard";
import { useSession } from "@/context/SessionContext";
import { CRAVELIST_LABEL } from "@/config/labels";
import { useSidebar } from "@/context/SidebarContext";

const SIDEBAR_EXPANDED = "w-60";

const navItems = [
  { href: "/", label: "Ask Craveo", icon: Sparkles },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/profile", label: "Profile", icon: User },
] as const;

interface SidebarProps {
  onOpenSavedLists: () => void;
  listsCount?: number;
}

export default function Sidebar({
  onOpenSavedLists,
  listsCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, isLoading } = useSession();
  const { setIsExpanded } = useSidebar();
  const [showGuestSignInCard, setShowGuestSignInCard] = useState(false);
  const [guestCardTop, setGuestCardTop] = useState<number | null>(null);
  const [guestCardLeft, setGuestCardLeft] = useState<number | null>(null);
  const cravelistsButtonRef = useRef<HTMLButtonElement | null>(null);

  const isExpanded = true;

  useEffect(() => {
    setIsExpanded(isExpanded);
  }, [isExpanded, setIsExpanded]);

  const updateGuestCardPosition = useCallback(() => {
    const button = cravelistsButtonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    setGuestCardTop(rect.top + rect.height / 2);
    setGuestCardLeft(rect.right + 12);
  }, []);

  useEffect(() => {
    if (showGuestSignInCard) {
      updateGuestCardPosition();
    }
  }, [showGuestSignInCard, isExpanded, updateGuestCardPosition]);

  return (
    <aside
      className={`hidden md:flex flex-col fixed left-0 top-0 h-screen z-40
        bg-black/40 backdrop-blur-xl border-r border-white/10
        transition-all duration-300 ease-out
        ${SIDEBAR_EXPANDED}`}
    >
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-3 px-4 h-16 shrink-0 border-b border-white/5"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold shadow-lg shadow-purple-500/25 shrink-0">
          C
        </div>
        <span
          className={`font-semibold tracking-tight text-lg overflow-hidden whitespace-nowrap transition-all duration-300 ${
            isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
          }`}
        >
          craveo
        </span>
      </Link>

      {/* Main nav */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-2 overflow-y-auto">
        {/* Ask Craveo (first) */}
        {(() => {
          const { href, label, icon: Icon } = navItems[0];
          const isActive = pathname === "/";
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors
                ${isActive ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "text-white/70 hover:text-white hover:bg-white/5 border border-transparent"}
                ${isExpanded ? "justify-start" : "justify-center"}`}
            >
              <Icon
                className="w-5 h-5 shrink-0"
                strokeWidth={isActive ? 2.5 : 2}
              />
              {isExpanded && (
                <span className="text-sm font-medium truncate">{label}</span>
              )}
            </Link>
          );
        })()}

        {/* My Cravelists (second, right after Ask Craveo) */}
        <div
          className="relative"
          onMouseEnter={() => {
            if (!user) {
              updateGuestCardPosition();
              setShowGuestSignInCard(true);
            }
          }}
          onMouseLeave={() => {
            if (!user) {
              setShowGuestSignInCard(false);
            }
          }}
        >
          <button
            ref={cravelistsButtonRef}
            type="button"
            onClick={() => {
              if (user) {
                onOpenSavedLists();
              } else {
                updateGuestCardPosition();
                setShowGuestSignInCard((v) => !v);
              }
            }}
            title={!user ? "Sign in to access your cravelists" : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl w-full
              text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer
              ${!user && showGuestSignInCard ? "bg-white/5 text-white" : ""}
              border border-transparent
              ${isExpanded ? "justify-start" : "justify-center"}`}
            aria-label={`My ${CRAVELIST_LABEL}`}
          >
            <div className="relative shrink-0">
              <BookMarked className="w-5 h-5" strokeWidth={2} />
              {listsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-purple-500 text-[10px] font-bold flex items-center justify-center">
                  {listsCount > 99 ? "99+" : listsCount}
                </span>
              )}
            </div>
            {isExpanded && (
              <span className="text-sm font-medium truncate">
                My {CRAVELIST_LABEL}
              </span>
            )}
          </button>

          {!user && (
            <CravelistsSignInCard
              isOpen={
                showGuestSignInCard &&
                guestCardTop !== null &&
                guestCardLeft !== null
              }
              onClose={() => setShowGuestSignInCard(false)}
              top={guestCardTop ?? 0}
              left={guestCardLeft ?? 0}
            />
          )}
        </div>

        {/* Discover, Calendar, Profile */}
        {navItems.slice(1).map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors
                ${isActive ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "text-white/70 hover:text-white hover:bg-white/5 border border-transparent"}
                ${isExpanded ? "justify-start" : "justify-center"}`}
            >
              <Icon
                className="w-5 h-5 shrink-0"
                strokeWidth={isActive ? 2.5 : 2}
              />
              {isExpanded && (
                <span className="text-sm font-medium truncate">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: User + Settings */}
      <div className="shrink-0 border-t border-white/5 p-3 space-y-1">
        <Link
          href={user ? "/profile" : "/login"}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-white/70 hover:text-white hover:bg-white/5 transition-colors
            ${isExpanded ? "justify-start" : "justify-center"}`}
        >
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10">
            {isLoading ? (
              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              </div>
            ) : user ? (
              user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                  {user.email?.[0].toUpperCase() ||
                    user.full_name?.[0]?.toUpperCase() ||
                    "U"}
                </div>
              )
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center">
                <User className="w-4 h-4 text-white/60" />
              </div>
            )}
          </div>
          {isExpanded && (
            <span className="text-sm font-medium truncate">
              {isLoading ? "..." : user ? "Profile" : "Sign in"}
            </span>
          )}
        </Link>

        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors
            ${isExpanded ? "justify-start" : "justify-center"}`}
        >
          <Settings className="w-5 h-5 shrink-0" />
          {isExpanded && (
            <span className="text-sm font-medium truncate">Settings</span>
          )}
        </Link>
      </div>
    </aside>
  );
}
