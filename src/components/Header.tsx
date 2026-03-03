"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLists } from "@/hooks/useLists";
import { useSession } from "@/context/SessionContext";
import { LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { signout } from "@/app/auth/actions";
import { CRAVELIST_LABEL } from "@/config/labels";

interface HeaderProps {
  onOpenSavedLists: () => void;
}

export default function Header({ onOpenSavedLists }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { lists } = useLists();
  const { user } = useSession();
  const supabase = createClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await supabase.auth.signOut();
    await signout();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 px-5 md:px-10 lg:px-20 py-4 sm:py-5 flex items-center justify-between transition-all duration-300 border-b ${
        isScrolled
          ? "bg-black/50 backdrop-blur-md border-white/5 py-3 sm:py-4"
          : "bg-transparent border-transparent"
      }`}
    >
      <Link href="/" className="flex items-center gap-2 group">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-shadow">
          C
        </div>
        <span className="text-lg font-semibold tracking-tight">craveo</span>
      </Link>

      {/** Mobile: profile avatar */}
      <Link
        href={user ? "/account" : "/login"}
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-full overflow-hidden border border-white/10 bg-black/20 active:scale-95 transition-transform"
        aria-label={user ? "Profile" : "Sign in"}
      >
        {user ? (
          user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-sm font-bold text-white">
              {user.email?.[0].toUpperCase() || user.full_name?.[0]?.toUpperCase() || "U"}
            </div>
          )
        ) : (
          <UserIcon className="w-5 h-5 text-white/60" />
        )}
      </Link>

      <div className="hidden md:flex items-center gap-3">
        <button
          onClick={onOpenSavedLists}
          className={`relative flex items-center gap-2 p-2 sm:pr-4 sm:pl-3 rounded-full transition-colors cursor-pointer group ${
            isScrolled
              ? "bg-black/40 hover:bg-black/60 shadow-lg shadow-black/20"
              : "bg-black/20 hover:bg-black/40"
          }`}
          aria-label={`My ${CRAVELIST_LABEL}`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
          </svg>
          <span className="text-sm font-medium hidden sm:inline">
            My {CRAVELIST_LABEL}
          </span>
          {lists.length > 0 && (
            <span className="absolute -top-1 -right-1 sm:top-0 sm:right-0 sm:relative sm:ml-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-purple-500 text-[10px] sm:text-xs font-bold flex items-center justify-center shadow-sm">
              {lists.length}
            </span>
          )}
        </button>

        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-2 p-1 pr-2 rounded-full border transition-all active:scale-95 ${
                isScrolled
                  ? "bg-black/40 border-white/10 hover:border-white/30"
                  : "bg-black/20 border-white/10 hover:border-white/30"
              } ${isDropdownOpen ? "border-purple-500/50 bg-black/60" : ""}`}
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                    {user.email?.[0].toUpperCase() || user.full_name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-white/50 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 py-2 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
                <div className="px-4 py-2 border-b border-white/5 mb-1">
                  <p className="text-xs text-white/40 truncate font-medium">
                    Signed in as
                  </p>
                  <p className="text-sm text-white/90 truncate font-semibold">
                    {user.email}
                  </p>
                </div>

                <Link
                  href="/account"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Profile</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors shadow-lg shadow-white/5"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
