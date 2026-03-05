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
          /^no\b|any\s+(streaming\s+)?service|any\s+platform/i.test(s),
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

    return `You are an expert media curator specializing in ${typeLabel}.

The user made an initial query and answered follow-up questions to refine their preferences.
${answersContext}

Based on ALL the information above, create a single, detailed, natural-language query that captures their full intent. This refined query will be fed into a recommendation engine.

IMPORTANT RULES:
- Return ONLY valid JSON, no markdown, no code fences
- The refined query should be 1-3 sentences, rich with specific preferences
- The refined query must be CONCRETE and ACTIONABLE: include specific adjectives, eras, tones, and subgenres the user chose — no vague phrases like "something good"
- Incorporate all their answers naturally${typeInstruction}${streamingInstruction}

Response format:
{
  "questions": [],
  "isComplete": true,
  "refinedQuery": "A detailed natural-language query incorporating all user preferences"
}`;
  }

  const round = previousAnswers.length + 1;

  const userContextHint =
    options?.userContext?.favoriteGenres?.length ||
    options?.userContext?.topGenres?.length
      ? " Given their profile and taste history, tailor questions to what they haven't yet specified."
      : "";

  const streamingHint =
    round === 1 && options?.streamingServiceInQuery
      ? `\n\nSTREAMING SERVICE: The user's query mentions "${options.streamingServiceInQuery}". You MUST include exactly ONE question asking if they want to restrict results to that service only. Example: "Want only ${options.streamingServiceInQuery} content?" with options ["Yes, ${options.streamingServiceInQuery} only", "No, any streaming service"]. Use id "streaming_restrict" for this question. The other 2 questions should cover different aspects (era, tone, length, etc.).`
      : "";

  return `You are an expert media curator specializing in ${typeLabel}.

Analyze the user's query to understand their intent and generate follow-up questions that will help create better, more personalized recommendations.
${answersContext}

This is round ${round} of follow-up questions.${
    round === 1
      ? " Ask questions directly relevant to their query. If they mentioned a genre or theme, ask about sub-preferences within that (era, tone, length). If their query is vague, ask about mood and pacing first."
      : " Build on their previous answers to drill deeper into their taste. NEVER ask about something they already answered. Each round must explore a DIFFERENT dimension (e.g., if round 1 covered mood, round 2 should cover era, length, or style — not the same axis)."
  }${userContextHint}${streamingHint}

IMPORTANT RULES:
- Return ONLY valid JSON, no markdown, no code fences
- Generate exactly 3 questions
- Each question must cover a DIFFERENT aspect — not 3 variations of the same question (e.g., one about era, one about tone, one about length/format)
- NEVER repeat themes from previous questions. Do not ask about something the user already answered
- Each question should have 3-5 concise options (1-4 words each)
- Questions should feel conversational and fun, not clinical
- Options should be diverse and cover different angles
- Set multiSelect to true when multiple options can apply (e.g., moods, themes)
- Set multiSelect to false for either/or choices (e.g., era preference)
- Each question needs a unique id (e.g., "q1", "q2", "q3")

Response format:
{
  "questions": [
    {
      "id": "q${round}_1",
      "text": "A conversational question about their preferences?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "multiSelect": true
    }
  ],
  "isComplete": false
}`;
}
