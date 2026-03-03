import { ContentType, UserRecommendContext } from "./types";
import { ENABLED_MEDIA_TYPES, getTypeLabel } from "@/config/media-types";

function getTypeFieldRule(): string {
  const types = ENABLED_MEDIA_TYPES.map((t) => `"${t}"`).join(" or ");
  return `- For the "type" field, use exactly: ${types}`;
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

export function getSystemPrompt(
  type: ContentType | ContentType[],
  options?: { excludeTitles?: string[]; userContext?: UserRecommendContext },
): string {
  const isMultiple = Array.isArray(type);
  const typeLabel = Array.isArray(type)
    ? type.map((t) => getTypeLabel(t)).join(", ")
    : getTypeLabel(type);

  const typeFieldRule = getTypeFieldRule();
  let onlyRecommendRule = `- Include a mix of ${typeLabel}`;
  if (type !== "all") {
    onlyRecommendRule = `- ONLY recommend items where the "type" field is exactly one of the requested types: ${typeLabel}`;
  }

  const exampleType = isMultiple ? type[0] : type === "all" ? "movie" : type;
  const isAnimeOnly =
    type === "anime" ||
    (Array.isArray(type) && type.length === 1 && type[0] === "anime");
  const hasExclusions = options?.excludeTitles && options.excludeTitles.length > 0;
  const itemCount =
    hasExclusions && isAnimeOnly
      ? "18-22 recommendations"
      : hasExclusions
        ? "22-28 recommendations"
        : isAnimeOnly
          ? "12 recommendations"
          : "15-20 recommendations";

  const titleHint = isMultiple
    ? ` When multiple types are requested (${typeLabel}), the title and description must reflect ALL of them (e.g. "Films & Series" or "movies and TV") — never mention only one type.`
    : "";

  const typeMixHint = isMultiple
    ? `\n- MANDATORY TYPE MIX: When multiple types are requested (${typeLabel}), you MUST include items from EACH type. Include at least 4-6 items from each requested type. Do NOT return only one type even if the user's wording emphasizes one (e.g. "movies" in the query) — the user explicitly chose multiple types.`
    : "";

  const excludeRule =
    options?.excludeTitles && options.excludeTitles.length > 0
      ? `\n- DO NOT recommend any of these titles (user already saw them): ${options.excludeTitles.join(", ")}. Suggest different works instead.`
      : "";

  const userContextBlock = options?.userContext
    ? formatUserContextBlock(options.userContext)
    : "";

  return `${userContextBlock}You are an expert media curator with encyclopedic knowledge of ${typeLabel}. 
Given a user's natural language query describing themes, moods, styles, or preferences, 
generate a curated collection of ${itemCount}.

IMPORTANT RULES:
- Return ONLY valid JSON, no markdown, no code fences, no explanation
- Include roughly 60% recognizable titles and 40% hidden gems. Avoid listing only obvious blockbusters.
- Each recommendation must have a specific 1-2 sentence description tying concrete aspects (a scene, a theme, a technique) to the query — avoid generic praise.
- STRICT CONSTRAINT ENFORCEMENT: If the user specifies a year or date range (e.g. "2015+", "after 2020", "from the 90s", "pre-2000"), you MUST ONLY include items that satisfy that constraint. Every "year" field in your response must fall within the specified range. Do not include older titles when they ask for recent/modern only.
- SINGLE-SEASON TV: If the user asks for "single-season", "one-season", "one season", "miniseries", "limited series", or similar, you MUST ONLY recommend TV shows with exactly ONE season. Do not include multi-season series (e.g. Stranger Things, Breaking Bad). Prefer limited series, miniseries, and one-and-done shows.
- BE CREATIVE: Make the collection title evocative and fitting. Keep it SHORT: 3-6 words max (e.g. "Cozy Rainy Day Picks", "Mind-Bending Sci-Fi").${titleHint}
- QUALITY CONTROL: If the user query specifies "popular", "highly rated", or "high ratings", YOU MUST ONLY INCLUDE ITEMS WITH A MATURE CRITICAL CONSENSUS (e.g., IMDB > 7.5 or Rotten Tomatoes > 80%). Do not take risks on obscure or poorly rated titles for these requests.${typeMixHint}${excludeRule}
${typeFieldRule}
${onlyRecommendRule}

Response format:
{
  "collectionTitle": "Short, punchy title (3-6 words)",
  "collectionDescription": "A brief 1-2 sentence description of the collection theme",
  "items": [
    {
      "title": "Title of the work",
      "creator": "Director/Showrunner/Author name",
      "year": 2020,
      "type": "${exampleType}",
      "description": "Why this fits the query - contextual explanation",
      "genres": ["Genre1", "Genre2"],
      "ratingScore": 8.5,
      "popularityScore": 90
    }
  ]
}`;
}
