"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";

export function DiscoverSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/ask?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-8">
      <form
        onSubmit={handleSubmit}
        className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl liquid-glass border border-white/10">
        <Search className="w-5 h-5 text-white/50 shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search collections..."
          className="flex-1 bg-transparent text-white placeholder:text-white/40 outline-none text-sm"
        />
      </form>
      <Link
        href="/ask"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:from-purple-400 hover:to-pink-400 transition-all shrink-0"
      >
        <Sparkles className="w-5 h-5" />
        Create with AI
      </Link>
    </div>
  );
}
