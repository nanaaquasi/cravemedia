"use client";

import Link from "next/link";
import { FolderPlus } from "lucide-react";
import { CRAVELIST_LABEL_PLURAL } from "@/config/labels";

interface CravelistsSignInCardProps {
  isOpen: boolean;
  onClose: () => void;
  top: number;
  left: number;
}

export function CravelistsSignInCard({
  isOpen,
  onClose,
  top,
  left,
}: CravelistsSignInCardProps) {
  if (!isOpen) return null;

  const loginUrl = `/login?next=${encodeURIComponent("/?openSavedLists=1")}`;

  return (
    <div
      className={`fixed z-50 w-[min(380px,calc(100vw-6rem))] 
        bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl 
        overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200`}
      style={{
        top: Math.max(16, top - 40),
        left,
      }}
      onMouseLeave={onClose}
      role="dialog"
      aria-labelledby="cravelists-signin-title"
      aria-describedby="cravelists-signin-desc"
    >
        <div className="p-6 sm:p-8">
          <div className="w-14 h-14 mb-5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <FolderPlus className="w-7 h-7 text-purple-400" strokeWidth={1.5} />
          </div>
          <h2
            id="cravelists-signin-title"
            className="text-xl font-bold text-white mb-2"
          >
            Organize your cravings
          </h2>
          <p
            id="cravelists-signin-desc"
            className="text-zinc-400 text-sm mb-8 leading-relaxed"
          >
            Log in to create {CRAVELIST_LABEL_PLURAL.toLowerCase()}, save items,
            and track your journey.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={loginUrl}
              className="flex-1 py-3 px-4 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors text-center"
            >
              Log in
            </Link>
            <Link
              href={loginUrl}
              className="flex-1 py-3 px-4 rounded-xl border border-white/20 bg-white/5 font-semibold text-sm hover:bg-white/10 transition-colors text-center"
            >
              Sign up for free
            </Link>
          </div>
        </div>
      </div>
  );
}
