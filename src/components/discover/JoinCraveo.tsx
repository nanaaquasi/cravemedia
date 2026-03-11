"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/context/SessionContext";
import { Sparkles, List, Route, Users, Heart } from "lucide-react";

const BANNER_BACKDROP =
  "https://image.tmdb.org/t/p/w1920/zo8CIjJ2nfNOevqNajwMRO6Hwka.jpg";

const BENEFITS = [
  {
    icon: Sparkles,
    text: "AI-powered recommendations",
    highlight: true,
  },
  {
    icon: List,
    text: "Create and share cravelists",
    highlight: false,
  },
  {
    icon: Route,
    text: "Track journeys with curated sequences",
    highlight: false,
  },
  {
    icon: Users,
    text: "Discover what the community is watching",
    highlight: false,
  },
  {
    icon: Heart,
    text: "Organize favorites across movies, TV, anime, and books",
    highlight: false,
  },
];

export function JoinCraveo() {
  const { user, isLoading } = useSession();

  if (isLoading || user) return null;

  return (
    <section className="mb-12">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 p-6 sm:p-8 lg:p-10 group hover:border-white/15 transition-colors min-h-[200px]">
        {/* Background image */}
        <Image
          src={BANNER_BACKDROP}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 1200px"
          unoptimized
        />
        {/* Gradient overlays — dark base + purple-pink accent */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-black/95 via-black/80 to-black/70"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-tl from-purple-900/50 via-transparent to-transparent"
          aria-hidden
        />
        <div
          className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-pink-900/20 via-transparent to-transparent"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          {/* Left column: headline + tagline */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Join Craveo
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-lg">
              Stop doomscrolling. Get recommendations that actually match your
              vibe. Curate lists, follow journeys, and discover what to watch
              next—powered by AI and the community.
            </p>
          </div>

          {/* Right column: benefits */}
          <div className="flex-1 min-w-0 w-full lg:max-w-md">
            <ul className="space-y-3">
              {BENEFITS.map(({ icon: Icon, text, highlight }) => (
                <li
                  key={text}
                  className={`flex items-center gap-3 text-sm ${
                    highlight
                      ? "text-purple-300 font-medium"
                      : "text-zinc-400"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      highlight ? "text-purple-400" : "text-zinc-500"
                    }`}
                  />
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3 mt-6">
              <Link
                href="/login?mode=signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-medium text-sm transition-colors"
              >
                Sign up for free
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl liquid-glass-strong border border-white/20 hover:border-white/30 text-white font-medium text-sm transition-colors"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
