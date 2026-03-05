import { ContentType, UserRecommendContext } from "./types";
import { ENABLED_MEDIA_TYPES, getTypeLabel } from "@/config/media-types";

function getTypeFieldRule(): string {
  const types = ENABLED_MEDIA_TYPES.map((t) => `"${t}"`).join(" or ");
  return `- For the "type" field, use exactly: ${types}`;
}

/** Type-specific first-item hook guidance (user's selected media types) */
function getFirstItemHookGuidance(type: ContentType | ContentType[]): string {
  const types = Array.isArray(type) ? type : [type];
  const resolvedTypes = types.includes("all") || types.length === 0
    ? [...ENABLED_MEDIA_TYPES]
    : (types.filter((t): t is "movie" | "tv" | "book" | "anime" => t !== "all") as ("movie" | "tv" | "book" | "anime")[]);
  const hooks: string[] = [];
  if (resolvedTypes.includes("movie"))
    hooks.push("films: hook in first 10–15 min");
  if (resolvedTypes.includes("tv"))
    hooks.push("TV: pilot or first episode must grab");
  if (resolvedTypes.includes("anime"))
    hooks.push("anime: first episode must compel");
  if (resolvedTypes.includes("book"))
    hooks.push("books: first chapter must pull reader in");
  if (hooks.length === 0) return "First item: must hook quickly — avoid slow openers that lose casual viewers.";
  return `First item: must hook quickly — ${hooks.join("; ")}. Avoid slow openers that lose casual viewers/readers.`;
}

/** Type-specific audience language (viewer vs reader) */
function getAudienceLanguage(type: ContentType | ContentType[]): string {
  const types = Array.isArray(type) ? type : [type];
  const resolved = types.includes("all") ? ENABLED_MEDIA_TYPES : (types.filter((t) => t !== "all") as ("movie" | "tv" | "book" | "anime")[]);
  const hasBooks = resolved.includes("book");
  const hasVisual = resolved.some((t) => t !== "book");
  if (hasBooks && !hasVisual) return "reader";
  if (hasBooks && hasVisual) return "viewer/reader";
  return "viewer";
}

/** Type-specific sequencing/pacing guidance based on selected media types */
function getTypeSequencingHint(type: ContentType | ContentType[]): string {
  const types = Array.isArray(type) ? type : [type];
  const resolved = types.includes("all") ? ENABLED_MEDIA_TYPES : (types.filter((t) => t !== "all") as ("movie" | "tv" | "book" | "anime")[]);
  const hints: string[] = [];
  if (resolved.includes("book"))
    hints.push("Books: consider pacing (length, density) when ordering; early titles should be propulsive");
  if (resolved.includes("anime"))
    hints.push("Anime: balance standalone films vs series arcs; multi-episode entries need clear payoff");
  if (resolved.includes("tv"))
    hints.push("TV: for limited/miniseries requests, ensure each pick has a complete arc");
  if (hints.length === 0) return "";
  return `\nTYPE-SPECIFIC: ${hints.join(". ")}`;
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
  return `\nUSER CONTEXT (use to personalize; do not override explicit query constraints):\n${parts.join("\n")}\nRespect their taste but surprise them — don't only recommend what they've already liked; show adjacent or deeper layers of it.\n`;
}

export function getJourneySystemPrompt(
  type: ContentType | ContentType[],
  options?: {
    excludeTitles?: string[];
    userContext?: UserRecommendContext;
    /** When set, ONLY include titles available on this streaming service */
    streamingServiceOnly?: string | null;
  },
): string {
  const typeLabel = Array.isArray(type)
    ? type.map((t) => getTypeLabel(t)).join(", ")
    : getTypeLabel(type);

  const typeFieldRule = getTypeFieldRule();
  let onlyRecommendRule = `- Include a mix of ${typeLabel}`;
  if (type !== "all") {
    onlyRecommendRule = `- ONLY include items where the "type" field is exactly one of the requested types: ${typeLabel}`;
  }

  let exampleType: string = type === "all" ? "movie" : (type as string);
  if (Array.isArray(type)) {
    exampleType = type[0];
  }

  const isMultiple = Array.isArray(type);
  const journeyTitleHint = isMultiple
    ? ` When multiple types are requested (${typeLabel}), the journey_title and description must reflect ALL of them (e.g. "Films & Series") — never mention only one type.`
    : "";
  const typeMixHint = isMultiple
    ? ` When multiple types are requested (${typeLabel}), include items from EACH type in the journey (at least 2-3 per type). Do NOT favor one type based on query wording.`
    : "";

  const excludeRule =
    options?.excludeTitles && options.excludeTitles.length > 0
      ? `\n7. EXCLUSIONS: DO NOT include any of these (user already saw them): ${options.excludeTitles.join(", ")}. Suggest different works instead.`
      : "";
  const streamingRule =
    options?.streamingServiceOnly
      ? `\nSTREAMING RESTRICTION: The user requested content ONLY from ${options.streamingServiceOnly}. You MUST ONLY include titles available on ${options.streamingServiceOnly}. Do NOT include any titles from HBO, Disney+, Prime Video, or other services — only ${options.streamingServiceOnly}.`
      : "";
  const excludeOffset = excludeRule ? 1 : 0;

  const userContextBlock = options?.userContext
    ? formatUserContextBlock(options.userContext)
    : "";

  const audience = getAudienceLanguage(type);
  const firstItemHook = getFirstItemHookGuidance(type);
  const typeSequencingHint = getTypeSequencingHint(type);

  return `${userContextBlock}You are an expert media curator specializing in transformative ${typeLabel} experiences — journeys where each piece deepens the last and changes how the ${audience} sees the subject. By the end, the user should feel they've gone somewhere, not just consumed a list.

Given a user's query, create a SEQUENCED journey of ${options?.excludeTitles && options.excludeTitles.length > 0 ? "10-12" : "6-8"} items that forms a coherent arc with emotional progression and a rewarding payoff.

TRANSFORMATION & ANTICIPATION:
- Design each journey so the user feels transformed by the end — not just entertained, but having gained new perspective or understanding.
- The final 1–2 items must deliver a payoff: a culmination that makes the journey feel complete. Avoid anticlimactic endings.
- Every "transitionToNext" must create anticipation: hint at what will shift in their understanding or feeling, not just describe the next title.
- The journey "description" must sell the experience: what they'll feel/understand by the end, why this order matters, why it's unique. Avoid generic phrases like "you'll discover great films."
- "whatYoullLearn": use specific, personal takeaways (e.g. "how directors use silence for tension", "why this ending works despite seeming ambiguous"), not vague terms like "cinematography" or "great acting."
- Hidden gems: each must earn its place in the arc. Users should feel they discovered something special — not just lesser-known, but purposefully chosen for this sequence.${typeSequencingHint}

CRITICAL REQUIREMENTS:
1. HOOK IMMEDIATELY: ${firstItemHook}
2. BUILD COMPLEXITY: Each item should prepare the ${audience} for the next
3. EMOTIONAL ARC: Early items hook and intrigue; middle items deepen; final item(s) deliver payoff or revelation
4. SHOW EVOLUTION: Include mix of eras/styles showing how the genre/topic developed. Include roughly 60% recognizable titles and 40% hidden gems
5. TRANSITIONS CREATE ANTICIPATION: Every "transitionToNext" must be specific, insightful, and create curiosity for what comes next
6. RESPECT CONSTRAINTS: If the user query specifies a rating (e.g., "> 8"), year, or date range (e.g. "2015+", "from the 90s"), popularity, or single-season/one-season/miniseries/limited series for TV, YOU MUST STRICTLY ADHERE TO IT. For single-season requests: ONLY include TV shows with exactly ONE season — no multi-season series. Every item's "year" must fall within any specified range.${typeMixHint}${streamingRule}${excludeRule}
${7 + excludeOffset}. QUALITY CONTROL: If the user query specifies "popular", "highly rated", or "high ratings", YOU MUST ONLY INCLUDE ITEMS WITH A MATURE CRITICAL CONSENSUS (e.g., IMDB > 7.5 or Rotten Tomatoes > 80%). Do not take risks on obscure or poorly rated titles for these requests.
${8 + excludeOffset}. Return ONLY valid JSON, no markdown, no code fences, no explanation
${9 + excludeOffset}. Keep journey_title SHORT: 3-6 words max (e.g. "Intro to Noir", "Sci-Fi Masterclass").${journeyTitleHint}
${typeFieldRule}
${onlyRecommendRule}

Response format (use exact field names):
{
  "journey_title": "Short, punchy title (3-6 words)",
  "description": "2-3 sentences that SELL the journey: what they'll feel/understand by the end, why this order matters, why it's unique. Be specific — no generic phrases.",
  "total_runtime_minutes": 0,
  "difficulty_progression": "e.g. accessible → challenging",
  "items": [
    {
      "position": 1,
      "title": "Exact title for API lookup",
      "creator": "Director/Showrunner/Author name",
      "year": 2020,
      "type": "${exampleType}",
      "description": "1-2 sentences tying concrete aspects (scene, theme, technique) to the query — avoid generic praise",
      "genres": ["Genre1", "Genre2"],
      "whyThisPosition": "If position 1: why start here and why it hooks. Otherwise: why this comes after the previous",
      "whatYoullLearn": "Specific, personal takeaway (e.g. how X uses Y for Z) — not vague terms",
      "keyThemes": ["theme1", "theme2", "theme3"],
      "difficultyLevel": "beginner",
      "ratingScore": 8.5,
      "popularityScore": 90,
      "transitionToNext": "Create anticipation for the NEXT item: hint at what will shift in their understanding or feeling. Use null for the last item."
    }
  ]
}

For "difficultyLevel" use exactly: "beginner" | "intermediate" | "advanced"
For "transitionToNext" use null for the last item, string for all others.`;
}
