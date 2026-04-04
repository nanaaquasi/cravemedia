import { ContentType, RefineAnswer, UserRecommendContext } from "./types";
import { getTypeLabel } from "@/config/media-types";

export function getRefineSystemPrompt(
  type: ContentType | ContentType[],
  previousAnswers: RefineAnswer[],
  options?: {
    userContext?: UserRecommendContext;
    /** When the query mentions a streaming service, we ask if they want to restrict */
    streamingServiceInQuery?: string | null;
  },
): string {
  const isMultiple = Array.isArray(type);
  const typeLabel = isMultiple
    ? type.map((t) => getTypeLabel(t)).join(", ")
    : getTypeLabel(type);

  const hasAnswers = previousAnswers.length > 0;

  const answersContext = hasAnswers
    ? `\nThe user has already answered these questions:\n${previousAnswers
        .map((a) => `Q: ${a.questionText}\nA: ${a.selected.join(", ")}`)
        .join("\n\n")}\n`
    : "";

  // After 2+ rounds of answers, finalize
  const shouldComplete = previousAnswers.length >= 2;

  if (shouldComplete) {
    const typeInstruction = isMultiple
      ? `\n- CRITICAL: The user selected multiple types (${typeLabel}). The refined query MUST explicitly mention ALL of them (e.g. "movies and TV shows" not just "movies"). Do not refer to only one type when the user chose both.`
      : "";

    const streamingInstruction = (() => {
      const svc = options?.streamingServiceInQuery;
      if (!svc) return "";

      const wantsOnly = previousAnswers.some((a) =>
        a.selected.some(
          (s) =>
            /only/i.test(s) && new RegExp(svc.toLowerCase(), "i").test(s),
        ),
      );
      const wantsAny = previousAnswers.some((a) =>
        a.selected.some((s) =>
          /^(?:no\b|any\s+(?:streaming\s+)?service|any\s+platform)/i.test(s),
        ),
      );

      if (wantsAny) {
        return `\n- The user chose NOT to restrict to ${svc} — do NOT include any streaming service constraint in the refined query.`;
      }
      if (wantsOnly) {
        return `\n- The user confirmed they want ONLY content from ${svc}. The refined query MUST explicitly state "ONLY available on ${svc}" or "only on ${svc}" so the recommendation engine will filter correctly.`;
      }
      return "";
    })();

    return `You're a friend who's been listening carefully to what someone wants to watch or read. They told you what they're in the mood for, and you asked a couple of follow-up questions to really nail it down. Now you need to summarize exactly what they're after — specific enough that anyone reading it could pick the perfect ${typeLabel} for them.

The user made an initial query and answered follow-up questions:
${answersContext}

Based on everything above, write a single, detailed query that captures what they actually want — the mood, the feeling, the vibe, the specifics. This will be used to generate their recommendations.

IMPORTANT RULES:
- Return ONLY valid JSON, no markdown, no code fences
- The refined query should be 1-3 sentences that feel natural and specific — like describing to a friend exactly what you're craving
- Be CONCRETE: include the mood, tone, era, and specifics they chose. "Dark, slow-burn thrillers from the last 5 years that keep you guessing" is good. "Something good and thrilling" is not.
- Always state an explicit release timeframe or era when the user gave any timing preference (e.g. "released in the last 5 years", "1990s–2000s", "classic pre-1970") — infer reasonably from their query and answers if they implied timing without naming years
- Capture what they want to FEEL, not just the genre. If they chose "cozy" and "heartwarming," the query should convey that warmth, not just list it as a filter.
- Incorporate all their answers naturally${typeInstruction}${streamingInstruction}

STRICT JSON SCHEMA — your response MUST match this exactly:
{
  "questions": [],
  "isComplete": true,
  "refinedQuery": "string (REQUIRED when isComplete is true)"
}

Every field is mandatory. "questions" must be an empty array. "isComplete" must be true. "refinedQuery" must be a non-empty string.`;
  }

  const round = previousAnswers.length + 1;

  const userContextHint =
    options?.userContext?.favoriteGenres?.length ||
    options?.userContext?.topGenres?.length
      ? " Given their profile and taste history, tailor questions to what they haven't yet specified."
      : "";

  const streamingHint =
    round === 1 && options?.streamingServiceInQuery
      ? `\n\nSTREAMING SERVICE: The user's query mentions "${options.streamingServiceInQuery}". You MUST include exactly ONE question asking if they want to restrict results to that service only. Example: "Want only ${options.streamingServiceInQuery} content?" with options ["Yes, ${options.streamingServiceInQuery} only", "No, any streaming service"]. Use id "streaming_restrict" for this question. The other 2 questions should cover different aspects (tone, length, etc.) — one of them MUST still be the release window question below.`
      : "";

  const dateRangeAnswered = previousAnswers.some(
    (a) =>
      /^release_window/i.test(a.questionId) ||
      /release|date range|when\b|era|decade|year|newer|older|classic|recent|modern|last \d|last few/i.test(
        a.questionText,
      ),
  );

  let dateRangeHint = "";
  if (round === 1) {
    dateRangeHint = `\n\nRELEASE DATE RANGE (REQUIRED): You MUST include exactly ONE question about when they want recommendations from — release window, era, or publication period — phrased from their actual query. Examples: if they asked for "recent" or "new", offer tight vs loose recency; if "90s" or "classics", offer adjacent eras or sub-ranges; if vague, offer options like "Last 2–3 years", "Last decade", "2000s–now", "Any era". Use id "release_window" for this question. It must be distinct from mood/tone/length questions.`;
  } else if (dateRangeAnswered) {
    dateRangeHint = `\n\nRELEASE DATE RANGE: The user already answered a timing/era question. Do NOT ask the same thing again. You may ask a narrow follow-up about timing only if their answer was vague (e.g. narrow "2010s" to early vs late). Otherwise use the 3 questions for other dimensions they have not covered.`;
  } else {
    dateRangeHint = `\n\nRELEASE DATE RANGE (REQUIRED): They have not yet locked in a release timeframe. Include exactly ONE question about release date range or era tailored to their query. Use id "release_window".`;
  }

  const mediaTypeRule = `\nMEDIA TYPE ALREADY CHOSEN: The user already selected ${typeLabel} as their media type(s) before reaching you. Do NOT ask what type of media they want (movies vs shows vs books etc.) — that's already decided. Focus your questions on mood, tone, pacing, era, and other dimensions of their query.`;

  return `You're a friend helping someone figure out exactly what they're in the mood for. They told you "${typeLabel}" and gave you a starting point, and now you're having a quick back-and-forth to really nail it — the way you'd naturally ask "wait, do you want something heavy or light?" before picking a movie together.

Your job: ask ${round === 1 ? "the first round of" : "a second round of"} follow-up questions based on what they've told you so far.
${answersContext}
${
    round === 1
      ? `React to their specific query — your questions should feel like a direct response to what they just said. If they said "best of 2024", ask about genres or moods within that, not generic preference questions. If they mentioned a genre or vibe, dig into what kind. The release-window question (see below) covers timing; keep the other two questions on aspects that are genuinely relevant to THEIR query.`
      : "Build on what they've already shared — your questions should feel like the next natural thing to ask in the conversation. NEVER re-ask something they already answered. Each question should explore a NEW dimension that would genuinely help narrow down what they want."
  }${userContextHint}${streamingHint}${dateRangeHint}${mediaTypeRule}

IMPORTANT RULES:
- Return ONLY valid JSON, no markdown, no code fences
- Generate exactly 3 questions
- Each question must cover a DIFFERENT aspect — not 3 variations of the same question (e.g., one about release window, one about tone, one about length/format)
- NEVER repeat themes from previous questions. Do not ask about something the user already answered
- NEVER ask about media type (movies/shows/books/anime) — the user already chose ${typeLabel}
- Each question should have 3-5 concise options (1-4 words each)
- Questions must feel like a natural response to THEIR specific query. If they said "best thrillers", ask about what kind of thrillers. If they said "feel-good comedies", ask about the mood within that. Generic questions like "What genre interests you?" are lazy — dig into what they actually asked for.
- Options should be distinct and cover genuinely different angles — not synonyms
- Set multiSelect to true when multiple options can apply (e.g., moods, themes)
- Set multiSelect to false for either/or choices (e.g., era preference)
- Each question needs a unique id (e.g., "q1", "q2", "q3")

STRICT JSON SCHEMA — your response MUST match this exactly:
{
  "questions": [
    {
      "id": "string (REQUIRED — unique per question, e.g. q${round}_1)",
      "text": "string (REQUIRED — the question text)",
      "options": ["string", "string", "string"] (REQUIRED — array of 3-5 option strings, NEVER empty, NEVER omit this field),
      "multiSelect": boolean (REQUIRED — true or false)
    }
  ],
  "isComplete": false,
  "refinedQuery": null
}

CRITICAL: Every question object MUST have all 4 fields: "id", "text", "options", "multiSelect". The "options" field MUST be a non-empty array of strings. Do NOT use any other field names (not "choices", not "answers", not "values" — only "options"). Omitting any field will break the application.`;
}
