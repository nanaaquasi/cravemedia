"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLists } from "@/hooks/useLists";

interface HeaderProps {
  onOpenSavedLists: () => void;
}

export default function Header({ onOpenSavedLists }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { lists } = useLists();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 md:px-8 py-4 sm:py-5 flex items-center justify-between transition-all duration-300 border-b ${
        isScrolled
          ? "bg-black/50 backdrop-blur-md border-white/5 py-3 sm:py-4"
          : "bg-transparent border-transparent"
      }`}
    >
      <Link href="/" className="flex items-center gap-2 group">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-shadow">
          C
        </div>
        <span className="text-lg font-semibold tracking-tight">cravemedia</span>
      </Link>

      <button
        onClick={onOpenSavedLists}
        className={`relative flex items-center gap-2 p-2 sm:pr-4 sm:pl-3 rounded-full transition-colors cursor-pointer group ${
          isScrolled
            ? "bg-white/10 hover:bg-white/15"
            : "bg-white/[0.04] hover:bg-white/[0.08]"
        }`}
        aria-label="My Cravings"
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
          Cravings List
        </span>
        {lists.length > 0 && (
          <span className="absolute -top-1 -right-1 sm:top-0 sm:right-0 sm:relative sm:ml-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-purple-500 text-[10px] sm:text-xs font-bold flex items-center justify-center shadow-sm">
            {lists.length}
          </span>
        )}
      </button>
    </header>
  );
}
