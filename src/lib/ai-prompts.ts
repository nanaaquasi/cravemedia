import { ContentType, ReferenceTitle, UserRecommendContext } from "./types";
import { ENABLED_MEDIA_TYPES, getTypeLabel } from "@/config/media-types";

function getTypeFieldRule(): string {
  const types = ENABLED_MEDIA_TYPES.map((t) => `"${t}"`).join(" or ");
  return `- For the "type" field, use exactly: ${types}`;
}

const ANIMATED_GENRE_HINTS = [
  "animation",
  "animated",
  "anime",
  "cartoon",
];

/** Heuristic: is this reference an animated work (anime OR Western animation)? */
function isAnimatedReference(ref: ReferenceTitle): boolean {
  if (ref.type === "anime") return true;
  const genres = (ref.genres ?? []).map((g) => g.toLowerCase());
  if (genres.some((g) => ANIMATED_GENRE_HINTS.some((h) => g.includes(h)))) {
    return true;
  }
  const desc = (ref.description ?? "").toLowerCase();
  return /\b(animated|animation|anime)\b/.test(desc);
}

/** Returns true when at least one reference title is animated. */
export function referencesIncludeAnimated(refs: ReferenceTitle[]): boolean {
  return refs.some(isAnimatedReference);
}

/** Format reference titles into a context block the AI sees. */
function formatReferenceTitlesBlock(refs: ReferenceTitle[]): string {
  if (refs.length === 0) return "";
  const lines = refs.map((ref, i) => {
    const parts: string[] = [];
    parts.push(`${i + 1}. "${ref.title}"`);
    const meta: string[] = [];
    if (ref.year) meta.push(String(ref.year));
    if (ref.type) meta.push(getTypeLabel(ref.type));
    if (meta.length) parts.push(`(${meta.join(", ")})`);
    if (ref.creator && ref.creator !== "Network/Creator" && ref.creator !== "Director/Studio" && ref.creator !== "Anime Studio") {
      parts.push(`by ${ref.creator}`);
    }
    let line = `   ${parts.join(" ")}`;
    if (ref.genres?.length) {
      line += `\n      Genres: ${ref.genres.join(", ")}`;
    }
    if (ref.description) {
      const desc = ref.description.length > 350
        ? ref.description.slice(0, 350).trim() + "…"
        : ref.description.trim();
      line += `\n      Synopsis: ${desc}`;
    }
    return line;
  });
  return `\nREFERENCE TITLES (the user wants more like these — match their format, era, sensibility, and core themes):\n${lines.join("\n")}\n`;
}

/** Similarity-matching guidance (only emitted when reference titles are present). */
function getSimilarityGuidance(refs: ReferenceTitle[]): string {
  if (refs.length === 0) return "";
  const hasAnimated = referencesIncludeAnimated(refs);
  const animatedClause = hasAnimated
    ? `\n- FORMAT MATTERS: At least one reference is ANIMATED. Prioritize animated picks (both anime and Western animation are valid — do NOT exclude one in favor of the other based on the type filter alone). Live-action picks should only appear if they share an exceptionally strong thematic match.`
    : `\n- FORMAT MATTERS: Match the medium of the references. If references are live-action, prefer live-action; if animated, prefer animated.`;
  return `\nSIMILARITY MATCHING (reference titles are provided above):
- The reference titles are the most important signal. Every pick should feel like it belongs in the same conversation as the references.
- Match the SHARED DNA: format/medium, era, tone, source material lineage (e.g. TTRPG actual-play, comic adaptation, manga adaptation, novel adaptation), creator/studio sensibility, audience age, and thematic center.${animatedClause}
- If a reference is part of a franchise or shared universe (e.g. Critical Role, MCU, Studio Ghibli), include obvious sister works from that universe early in the list — those are usually the best matches.
- If the user added a "mood" qualifier alongside the reference (e.g. "more like X — funnier"), let the mood adjust the picks WITHOUT abandoning the format/medium of the reference.
- Even if a reference title is unfamiliar to you, use its synopsis and genres above to triangulate. Trust the metadata over guesses.
- Do NOT include any of the reference titles themselves in the recommendations.`;
}

function formatUserContextBlock(ctx: UserRecommendContext): string {
  const parts: string[] = [];
  if (ctx.favoriteGenres?.length) {
    parts.push(`- Favorite genres: ${ctx.favoriteGenres.join(", ")}`);
  }
  if (ctx.streamingServices?.length) {
    parts.push(
      `- Streaming services: ${ctx.streamingServices.join(", ")} — prefer titles available on these when relevant`,
    );
  }
  if (ctx.topGenres?.length) {
    const top = ctx.topGenres
      .slice(0, 5)
      .map((g) => `${g.genre} (${g.count})`)
      .join(", ");
    parts.push(`- Top genres from history: ${top}`);
  }
  if (ctx.recentlyWatched.length) {
    const titles = ctx.recentlyWatched
      .slice(0, 15)
      .map((i) => `${i.title} (${i.type})`)
      .join("; ");
    parts.push(`- Recently watched: ${titles} — avoid repeating these`);
  }
  if (ctx.recentlyRated.length) {
    const high = ctx.recentlyRated
      .filter((r) => r.rating >= 4)
      .slice(0, 10)
      .map((r) => `${r.title} (${r.rating}/5)`)
      .join("; ");
    if (high) {
      parts.push(`- Recently rated highly (4-5): ${high} — understand their taste`);
    }
  }
  if (parts.length === 0) return "";
  return `\nUSER CONTEXT (use to personalize; do not override explicit query constraints):\n${parts.join("\n")}\n`;
}

/**
 * System prompt split into a static "cacheable" portion (rules/format/persona)
 * and a "dynamic" portion (per-request context like user data, references,
 * exclusions). Used by Anthropic to enable prompt caching — the cacheable
 * portion gets `cache_control: ephemeral` and is reused across requests for
 * ~90% input-cost savings and ~25–40% TTFT reduction on warm cache.
 */
export interface SystemPromptParts {
  cacheable: string;
  dynamic: string;
}

export function getSystemPromptParts(
  type: ContentType | ContentType[],
  options?: {
    excludeTitles?: string[];
    userContext?: UserRecommendContext;
    /** When set, ONLY recommend titles available on this streaming service */
    streamingServiceOnly?: string | null;
    /** Reference titles for "more like X" queries — provides rich context */
    referenceTitles?: ReferenceTitle[];
  },
): SystemPromptParts {
  const isMultiple = Array.isArray(type);
  const referenceTitles = options?.referenceTitles ?? [];
  const hasReferences = referenceTitles.length > 0;
  const refsHaveAnimated = hasReferences && referencesIncludeAnimated(referenceTitles);

  // When references are animated and user filtered to a single visual type (tv or anime),
  // broaden allowed types so Western animation and Japanese anime can both surface.
  const effectiveTypes = (() => {
    if (!hasReferences || !refsHaveAnimated) return type;
    const arr = Array.isArray(type) ? type : [type];
    if (arr.includes("all")) return type;
    const visualOnly = arr.every((t) => t === "tv" || t === "anime");
    if (!visualOnly) return type;
    const broadened = Array.from(new Set([...arr, "tv", "anime"])) as ContentType[];
    return broadened.length === 1 ? broadened[0] : broadened;
  })();

  const typeLabel = Array.isArray(effectiveTypes)
    ? effectiveTypes.map((t) => getTypeLabel(t)).join(", ")
    : getTypeLabel(effectiveTypes);

  const effectiveIsMultiple = Array.isArray(effectiveTypes);
  const typeFieldRule = getTypeFieldRule();
  let onlyRecommendRule = `- Include a mix of ${typeLabel}`;
  if (effectiveTypes !== "all") {
    onlyRecommendRule = `- ONLY recommend items where the "type" field is exactly one of the requested types: ${typeLabel}`;
  }

  const exampleType = effectiveIsMultiple
    ? (effectiveTypes as ContentType[])[0]
    : effectiveTypes === "all"
      ? "movie"
      : effectiveTypes;
  const isAnimeOnly =
    effectiveTypes === "anime" ||
    (Array.isArray(effectiveTypes) &&
      effectiveTypes.length === 1 &&
      effectiveTypes[0] === "anime");
  const hasExclusions = options?.excludeTitles && options.excludeTitles.length > 0;
  // Lower default item counts → fewer output tokens → faster generation.
  // The "load more" pattern (re-call with excludeTitles populated) bumps
  // counts back up when the user explicitly asks for more.
  const itemCount =
    hasExclusions && isAnimeOnly
      ? "14-18 recommendations"
      : hasExclusions
        ? "16-20 recommendations"
        : isAnimeOnly
          ? "10 recommendations"
          : "10-12 recommendations";

  const titleHint = effectiveIsMultiple
    ? ` When multiple types are requested (${typeLabel}), the title and description must reflect ALL of them (e.g. "Films & Series" or "movies and TV") — never mention only one type.`
    : "";

  // Suppress mandatory-type-mix when the multi-type list was auto-broadened from a
  // single-visual-type request (e.g. user picked tv but reference is animated).
  const wasAutoBroadened =
    refsHaveAnimated &&
    !isMultiple &&
    Array.isArray(effectiveTypes) &&
    effectiveTypes.length > 1;
  const typeMixHint =
    effectiveIsMultiple && !wasAutoBroadened
      ? `\n- MANDATORY TYPE MIX: When multiple types are requested (${typeLabel}), you MUST include items from EACH type. Include at least 4-6 items from each requested type. Do NOT return only one type even if the user's wording emphasizes one (e.g. "movies" in the query) — the user explicitly chose multiple types.`
      : "";

  const excludeRule =
    options?.excludeTitles && options.excludeTitles.length > 0
      ? `\n- DO NOT recommend any of these titles (user already saw them): ${options.excludeTitles.join(", ")}. Suggest different works instead.`
      : "";

  const streamingRule =
    options?.streamingServiceOnly
      ? `\n- STREAMING RESTRICTION: The user requested content ONLY from ${options.streamingServiceOnly}. You MUST ONLY recommend titles that are available on ${options.streamingServiceOnly}. Do NOT include any titles from HBO, Disney+, Prime Video, or other services — only ${options.streamingServiceOnly}.`
      : "";

  const userContextBlock = options?.userContext
    ? formatUserContextBlock(options.userContext)
    : "";

  const referenceBlock = formatReferenceTitlesBlock(referenceTitles);
  const similarityGuidance = getSimilarityGuidance(referenceTitles);

  // ── Cacheable static block ──────────────────────────────────────────────
  // Stable across requests for a given type combination. Marked as a single
  // ephemeral cache breakpoint when used via Anthropic. Static = persona,
  // rules, format, JSON schema. Dynamic = user/request-specific context.
  const cacheable = `You're putting together a list of ${typeLabel} for a friend who just told you what they're in the mood for. You know their taste, you care about getting it right, and you'd only recommend something you'd genuinely stake your reputation on. Think like a thoughtful friend, not a critic or algorithm.

Given a user's query describing themes, moods, styles, or preferences, generate a curated list of ${typeLabel}.

QUALITY & FIT (read the room):
- Match the list to the user's intent. If they say "best of 2024", "top rated", "must-watch", or "greatest" — they mean it. Lean heavily on critically acclaimed, widely loved titles. This is not the time for hidden gems or personal picks — give them the consensus greats.
- If the query is more exploratory or mood-based ("cozy rainy day vibes", "movies that make you think"), then you have more freedom. Mix well-known titles with lesser-known ones that genuinely fit — but only if they truly belong, not for variety's sake.
- When in doubt, ask yourself: "Would a friend actually recommend this for what they asked?" If the answer is "only because it's technically good" — leave it out.

HOW TO PICK EACH TITLE:
- Every pick should make the user think "yes, this is exactly what I was looking for." If it doesn't clearly fit the mood or theme they described, leave it out.
- The list should feel cohesive. Every item should feel like it belongs alongside the others — like they share a sensibility, a mood, or an energy that ties them together.
- "description": ONE sentence (max ~25 words). Tell them in a single line why they'll love this — speak to feeling, what makes it special, or what moment will stick. Write like a quick text to a friend, not a review.
- NO GIMMICKS: Don't include something just because it's a classic, award-winner, or "important." Every title earns its spot by genuinely fitting what the user asked for.

COLLECTION IDENTITY:
- "collectionTitle": Short (3-6 words), warm and evocative. It should feel like a playlist name a friend would text you, not a Wikipedia category. e.g. "For When You Need a Good Cry", "Stories That Stay With You", "Quiet Films, Loud Feelings."${titleHint}
- "collectionDescription": Write it like you're handing this list to a friend: "You said you wanted X — so here, these are the ones I'd actually vouch for." Be specific about the mood or feeling they'll get, not a dry summary of the theme.

STRICT RULES:
- Return ONLY valid JSON, no markdown, no code fences, no explanation
- CONSTRAINT ENFORCEMENT: If the user specifies a year or date range (e.g. "2015+", "after 2020", "from the 90s", "pre-2000"), you MUST ONLY include items that satisfy that constraint. Every "year" field must fall within the specified range. Do not include older titles when they ask for recent/modern only.
- SINGLE-SEASON TV: If the user asks for "single-season", "one-season", "one season", "miniseries", "limited series", or similar, you MUST ONLY recommend TV shows with exactly ONE season. Do not include multi-season series (e.g. Stranger Things, Breaking Bad). Prefer limited series, miniseries, and one-and-done shows.
- QUALITY CONTROL: If the user query specifies "popular", "highly rated", or "high ratings", YOU MUST ONLY INCLUDE ITEMS WITH A MATURE CRITICAL CONSENSUS (e.g., IMDB > 7.5 or Rotten Tomatoes > 80%). Do not take risks on obscure or poorly rated titles for these requests.${typeMixHint}
${typeFieldRule}
${onlyRecommendRule}

Response format:
{
  "collectionTitle": "Short, warm title (3-6 words)",
  "collectionDescription": "1-2 sentences: what mood/feeling this list delivers, written like you're handing it to a friend",
  "items": [
    {
      "title": "Title of the work",
      "creator": "Director/Showrunner/Author name",
      "year": 2020,
      "type": "${exampleType}",
      "description": "ONE sentence (max ~25 words): why they'll love this — speak to feeling, not technique",
      "genres": ["Genre1", "Genre2"],
      "ratingScore": 8.5,
      "popularityScore": 90
    }
  ]
}`;

  // ── Dynamic per-request block ───────────────────────────────────────────
  // Contains user context, references, item count, and per-request constraints.
  const itemCountInstruction = `\n\nTARGET COUNT: Generate ${itemCount}. The user wants a full pool to choose from. Never return fewer unless the query is so specific that fewer titles genuinely exist (e.g. "single-season sci-fi from 2024 on Apple TV+"). If in doubt, include more rather than fewer.`;
  const dynamic = `${userContextBlock}${referenceBlock}${similarityGuidance}${itemCountInstruction}${excludeRule}${streamingRule}`;

  return { cacheable, dynamic };
}

/**
 * Concatenated form of the system prompt for providers that don't support
 * prompt caching breakpoints (Gemini, OpenAI). Anthropic should use
 * `getSystemPromptParts` to take advantage of `cache_control: ephemeral`.
 */
export function getSystemPrompt(
  type: ContentType | ContentType[],
  options?: {
    excludeTitles?: string[];
    userContext?: UserRecommendContext;
    streamingServiceOnly?: string | null;
    referenceTitles?: ReferenceTitle[];
  },
): string {
  const { cacheable, dynamic } = getSystemPromptParts(type, options);
  // Dynamic block leads (so user/reference context appears before the
  // persona/rules), preserving the original prompt ordering for Gemini/OpenAI.
  return `${dynamic ? `${dynamic.trimStart()}\n\n` : ""}${cacheable}`;
}
