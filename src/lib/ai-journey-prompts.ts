import {
  ContentType,
  PromoteItem,
  UserRecommendContext,
} from "./types";
import { ENABLED_MEDIA_TYPES, getTypeLabel } from "@/config/media-types";
import { JOURNEY_MAX_ITEMS } from "@/config/journey";

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

  return `${userContextBlock}You are recommending a sequence of ${typeLabel} to someone you care about. Your goal is simple: each piece should make them feel something real, and by the end they should feel moved, satisfied, and eager to tell a friend about what they just experienced. Think like a thoughtful friend, not a film professor.

Given a user's query, create a SEQUENCED journey of ${options?.excludeTitles && options.excludeTitles.length > 0 ? "10-12" : "6-8"} items that flows naturally from start to finish — emotionally clear, genuinely enjoyable, and deeply satisfying.

EMOTIONAL FLOW (this is the heart of a good journey):
- The sequence should feel like a conversation, not a curriculum. Each piece naturally leads to the next because of how it makes the ${audience} feel.
- Start with something warm, inviting, and immediately engaging — something that makes the ${audience} think "oh, I'm going to love this."
- Build emotional depth through the middle — the ${audience} should feel more invested with each step, never confused or lost.
- End on something that feels like arriving somewhere good: uplifting, cathartic, or meaningfully moving. The ${audience} should want to share this journey, not recover from it. Never end on something bleak, ambiguous, or hollow.
- If the journey touches heavy themes, always provide emotional relief or resolution before the end. Don't leave someone in a dark place.${typeSequencingHint}

WHAT MAKES EACH ITEM MATTER:
- Every title must earn its place by how it makes the ${audience} FEEL in context of this sequence — not because it's critically acclaimed or culturally important.
- "description": Write like you're telling a friend why they'll love this one, right now, at this point in the journey. Tie it to the emotional moment, not to film theory.
- "whatYoullLearn": Frame as a personal, relatable insight — what this will make them feel or realize about themselves, relationships, or the world. e.g. "you'll understand why letting go is sometimes the bravest thing" or "this will change how you see ordinary kindness." Never use academic language like "cinematography techniques" or "narrative structure."
- "whyThisPosition": Explain the emotional logic — why does this feel right after the last one? What mood are they in, and why does this meet them there?
- "transitionToNext": Acknowledge how the ${audience} likely feels right now, then explain why the next piece is exactly what they need next. Think emotional momentum — like a friend saying "and now you're ready for this." Not a cliffhanger, not an intellectual tease.
- Prioritize titles that genuinely serve the emotional flow. Include well-known works when they're the right fit, and lesser-known ones only when they'll land harder in this sequence. Never include something obscure just for variety.

CRITICAL REQUIREMENTS:
1. HOOK IMMEDIATELY: ${firstItemHook}
2. NATURAL MOMENTUM: Each item should feel like an obvious, satisfying "what's next" — the ${audience} should never wonder why something is here
3. EMOTIONAL CLARITY: The ${audience} should always know where they are emotionally in the journey. No confusion, no jarring tonal shifts without purpose
4. SATISFYING ENDING: The final item MUST leave the ${audience} feeling fulfilled — warm, hopeful, moved, or gently transformed. This is non-negotiable
5. TRANSITIONS ARE EMOTIONAL HANDOFFS: Every "transitionToNext" must feel like a friend saying "trust me, you need this next"
6. RESPECT CONSTRAINTS: If the user query specifies a rating (e.g., "> 8"), year, or date range (e.g. "2015+", "from the 90s"), popularity, or single-season/one-season/miniseries/limited series for TV, YOU MUST STRICTLY ADHERE TO IT. For single-season requests: ONLY include TV shows with exactly ONE season — no multi-season series. Every item's "year" must fall within any specified range.${typeMixHint}${streamingRule}${excludeRule}
${7 + excludeOffset}. QUALITY CONTROL: If the user query specifies "popular", "highly rated", or "high ratings", YOU MUST ONLY INCLUDE ITEMS WITH A MATURE CRITICAL CONSENSUS (e.g., IMDB > 7.5 or Rotten Tomatoes > 80%). Do not take risks on obscure or poorly rated titles for these requests.
${8 + excludeOffset}. NO GIMMICKS: Do NOT include titles just because they're critically acclaimed, thematically clever, or "important." Every pick must feel like it genuinely belongs in the emotional flow. No filler, no "you should watch this because it's a classic."
${9 + excludeOffset}. Return ONLY valid JSON, no markdown, no code fences, no explanation
${10 + excludeOffset}. Keep journey_title SHORT: 3-6 words max (e.g. "Finding Light in Darkness", "Love Against the Odds").${journeyTitleHint}
${typeFieldRule}
${onlyRecommendRule}

Response format (use exact field names):
{
  "journey_title": "Short, warm title (3-6 words)",
  "description": "2-3 sentences telling the ${audience} what emotional experience awaits them. Write it like telling a friend: 'By the end of this, you'll feel [X].' Be honest and specific — no generic phrases like 'you'll discover great films.'",
  "total_runtime_minutes": 0,
  "difficulty_progression": "e.g. light & inviting → emotionally rich → deeply moving",
  "items": [
    {
      "position": 1,
      "title": "Exact title for API lookup",
      "creator": "Director/Showrunner/Author name",
      "year": 2020,
      "type": "${exampleType}",
      "description": "1-2 sentences: why a friend would love this right now, at this point in the journey. Speak to emotion, not technique.",
      "genres": ["Genre1", "Genre2"],
      "whyThisPosition": "The emotional logic: what mood is the ${audience} in after the previous, and why does this meet them there? For position 1: why this is the perfect welcoming start.",
      "whatYoullLearn": "A personal, relatable insight — what this will make them feel or realize. e.g. 'you'll understand why vulnerability takes more courage than strength'",
      "keyThemes": ["theme1", "theme2", "theme3"],
      "difficultyLevel": "beginner",
      "ratingScore": 8.5,
      "popularityScore": 90,
      "transitionToNext": "How the ${audience} likely feels now + why the next piece is exactly what they need. Warm and inviting, not a cliffhanger. Use null for the last item."
    }
  ]
}

For "difficultyLevel" use as emotional weight: "beginner" = lighter and accessible, "intermediate" = emotionally engaging with some complexity, "advanced" = intense or heavy. A good journey starts lighter and builds, but never overwhelms without relief.
For "transitionToNext" use null for the last item, string for all others.`;
}

/** User message body for journey-from-list (serialized JSON). */
export function buildJourneyFromListUserMessage(
  items: PromoteItem[],
  collectionName: string,
  collectionDescription: string | null | undefined,
): string {
  const payload = {
    collectionName,
    collectionDescription: collectionDescription ?? null,
    itemCount: items.length,
    items: items.map((item, index) => ({
      index: index + 1,
      title: item.title,
      year: item.year,
      type: item.type,
      genres: item.genres,
      creator: item.creator ?? null,
      description: item.description ?? null,
    })),
  };
  return JSON.stringify(payload, null, 0);
}

export function getJourneyFromListPrompt(
  type: ContentType | ContentType[],
  options: {
    maxItems?: number;
    userContext?: UserRecommendContext;
    inputItemCount: number;
  },
): string {
  const maxItems = options.maxItems ?? JOURNEY_MAX_ITEMS;
  const typeLabel = Array.isArray(type)
    ? type.map((t) => getTypeLabel(t)).join(", ")
    : getTypeLabel(type);

  const typeFieldRule = getTypeFieldRule();
  let onlyTypesRule = `- Each item's "type" must be one of the types present in the user's list (respect their actual types).`;
  if (type !== "all" && !Array.isArray(type)) {
    onlyTypesRule = `- ONLY include items where "type" is exactly: ${typeLabel}`;
  } else if (Array.isArray(type) && !type.includes("all")) {
    onlyTypesRule = `- ONLY include items where "type" is one of: ${typeLabel}`;
  }

  let exampleType: string = type === "all" ? "movie" : (type as string);
  if (Array.isArray(type)) {
    exampleType = type[0] ?? "movie";
  }

  const audience = getAudienceLanguage(type);
  const firstItemHook = getFirstItemHookGuidance(type);
  const typeSequencingHint = getTypeSequencingHint(type);
  const userContextBlock = options.userContext
    ? formatUserContextBlock(options.userContext)
    : "";

  const selectionRule =
    options.inputItemCount > maxItems
      ? `
SELECTION (CRITICAL): The user provided ${options.inputItemCount} items but a journey may include at most ${maxItems} items.
- Choose exactly ${maxItems} items from their list that form the strongest thematic/emotional arc.
- In the journey "description", add 1–2 sentences explaining which titles you omitted and why (e.g. weaker fit for the arc, redundant theme, pacing).
- Do NOT invent or add titles not in their list.`
      : `
The user provided ${options.inputItemCount} items. Include every item exactly once in your output (reorder only).`;

  return `${userContextBlock}You are helping a friend turn their saved list (Cravelist) into a meaningful journey — same titles, but in an order that tells a story, builds emotion, and ends somewhere that feels deeply satisfying. Think like a thoughtful friend, not a curator writing liner notes.

INPUT: You will receive JSON with collectionName, collectionDescription (optional), and items[] with title, year, type, genres, creator, description.

STRICT RULES:
- You MUST ONLY use titles from the provided items. Never add new works.
- Reorder items into the best viewing/reading sequence for emotional flow and a satisfying ending.
- Match each output item's "title", "year", and "type" to the corresponding work from the input (exact title spelling as given).
${selectionRule}

EMOTIONAL FLOW (this is the heart of a good journey):
- Start with something warm, inviting, and immediately engaging — something that makes the ${audience} think "oh, I'm going to love this."
- Build emotional depth through the middle. Each step should feel like a natural conversation — "now that you felt that, you're ready for this."
- End on something that feels like arriving somewhere good: uplifting, cathartic, or meaningfully moving. The ${audience} should want to share this journey. Never end on something bleak, ambiguous, or hollow.
- If the journey touches heavy themes, ensure there is emotional relief or resolution before the ending.
- The journey "description" must tell the ${audience} what emotional experience awaits. Write it like you're talking to a friend: "By the end of this, you'll feel..." ${options.inputItemCount > maxItems ? "Also explain which titles were left out and why — be honest and kind about it." : ""}
- Every "transitionToNext" should be an emotional handoff: acknowledge how they likely feel, then explain why the next piece is exactly what they need. Think "trust me, you need this next." Null only on the last item.
- "whatYoullLearn" must be personal, relatable insights — what this will make them feel or realize. Never academic language.
${typeSequencingHint}

CRITICAL:
1. HOOK: ${firstItemHook}
2. SATISFYING ENDING: The final item MUST leave the ${audience} feeling fulfilled — warm, hopeful, moved, or gently transformed. This is non-negotiable.
3. EMOTIONAL ARC: welcoming → deepening → resolution. The ${audience} should always know where they are emotionally.
4. TRANSITIONS ARE EMOTIONAL HANDOFFS: warm and inviting, not cliffhangers or intellectual teases
5. NO GIMMICKS: Every pick must earn its place through genuine emotional fit. No title is here "because it's a classic" — only because it belongs in this sequence.
6. Return ONLY valid JSON — no markdown, no code fences
7. Keep journey_title SHORT: 3–6 words
${typeFieldRule}
${onlyTypesRule}

Response format (exact field names):
{
  "journey_title": "Short, warm title (3-6 words)",
  "description": "2-4 sentences telling the ${audience} what emotional experience awaits${options.inputItemCount > maxItems ? "; include honest rationale for which items were left out" : ""}",
  "total_runtime_minutes": 0,
  "difficulty_progression": "e.g. light & inviting → emotionally rich → deeply moving",
  "items": [
    {
      "position": 1,
      "title": "Exact title from input",
      "creator": "Director/Showrunner/Author",
      "year": 2020,
      "type": "${exampleType}",
      "description": "1-2 sentences: why a friend would love this right now, at this point in the journey",
      "genres": ["Genre1", "Genre2"],
      "whyThisPosition": "The emotional logic: what mood are they in, and why does this meet them there?",
      "whatYoullLearn": "A personal, relatable insight — what this will make them feel or realize",
      "keyThemes": ["theme1", "theme2"],
      "difficultyLevel": "beginner",
      "ratingScore": 8.0,
      "popularityScore": 80,
      "transitionToNext": "How they likely feel now + why the next piece is what they need — or null if last"
    }
  ]
}

Use "difficultyLevel" as emotional weight: "beginner" = lighter and accessible, "intermediate" = emotionally engaging, "advanced" = intense or heavy.
Audience framing: ${audience}`;
}
