"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import type { PersonDetails, PersonCredit } from "@/lib/tmdb";

const BIO_TRUNCATE_LENGTH = 280;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface Props {
  person: PersonDetails;
  credits: PersonCredit[];
}

export default function PersonDetailClient({ person, credits }: Props) {
  const router = useRouter();
  const [bioExpanded, setBioExpanded] = useState(false);
  const bio = person.biography ?? "";
  const isBioLong = bio.length > BIO_TRUNCATE_LENGTH;
  const displayBio = isBioLong && !bioExpanded
    ? bio.slice(0, BIO_TRUNCATE_LENGTH).trim() + "…"
    : bio;

  const birthInfo =
    person.birthday || person.placeOfBirth
      ? [
          person.birthday ? formatDate(person.birthday) : null,
          person.placeOfBirth ?? null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <main className="min-h-screen flex flex-col overflow-x-hidden w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <button
        onClick={() => router.back()}
        className="mt-4 mb-2 -mx-1 inline-flex items-center gap-2 px-2 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors cursor-pointer w-fit"
        aria-label="Go back"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back</span>
      </button>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start mt-2">
        <div className="shrink-0 w-32 sm:w-40 aspect-square rounded-2xl overflow-hidden bg-zinc-800 border border-white/[0.08]">
          {person.profileUrl ? (
            <Image
              src={person.profileUrl}
              alt={person.name}
              width={160}
              height={160}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-zinc-600">
              👤
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {person.name}
            </h1>
            {person.knownForDepartment && (
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {person.knownForDepartment}
              </p>
            )}
            {birthInfo && (
              <p className="text-sm text-[var(--text-secondary)] mt-2">
                {birthInfo}
              </p>
            )}
          </div>
          <FavoriteButton
            targetType="person"
            targetId={String(person.id)}
            title={person.name}
            imageUrl={person.profileUrl ?? null}
            metadata={{ known_for: person.knownForDepartment ?? undefined }}
          />
        </div>
      </div>

      {/* Biography */}
      {person.biography && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-white mb-2">Biography</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
            {displayBio}
          </p>
          {isBioLong && (
            <button
              type="button"
              onClick={() => setBioExpanded((e) => !e)}
              className="mt-2 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
            >
              {bioExpanded ? "Show Less" : "Show More"}
            </button>
          )}
        </section>
      )}

      {/* Known For */}
      {credits.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-white mb-3">Known For</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {credits.map((credit) => (
              <Link
                key={`${credit.type}-${credit.id}`}
                href={`/media/${credit.type}/${credit.id}`}
                className="group shrink-0 w-28 sm:w-32 block"
              >
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 border border-white/[0.06] mb-2">
                  {credit.posterUrl ? (
                    <Image
                      src={credit.posterUrl}
                      alt={credit.title}
                      fill
                      className="object-cover transition-transform duration-200 group-hover:scale-105"
                      sizes="128px"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-2xl text-zinc-600">
                      {credit.type === "movie" ? "🎬" : "📺"}
                    </div>
                  )}
                  {credit.voteAverage > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/60 text-[10px] font-medium text-amber-300">
                      ★ {credit.voteAverage.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                  {credit.title}
                </p>
                {(credit.character || credit.job) && (
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    {credit.character ?? credit.job}
                  </p>
                )}
                {credit.releaseDate && (
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {credit.releaseDate.slice(0, 4)}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* TMDB link */}
      <p className="mt-8 text-xs text-[var(--text-muted)]">
        Data from{" "}
        <a
          href={`https://www.themoviedb.org/person/${person.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-purple-400 transition-colors"
        >
          The Movie Database (TMDB)
        </a>
      </p>
    </main>
  );
}
