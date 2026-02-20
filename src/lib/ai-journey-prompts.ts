import { ContentType } from "./types";
import { ENABLED_MEDIA_TYPES, getTypeLabel } from "@/config/media-types";

function getTypeFieldRule(): string {
  const types = ENABLED_MEDIA_TYPES.map((t) => `"${t}"`).join(" or ");
  return `- For the "type" field, use exactly: ${types}`;
}

export function getJourneySystemPrompt(
  type: ContentType | ContentType[],
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

  return `You are an expert media curator specializing in creating learning journeys through ${typeLabel}.

Given a user's query, create a SEQUENCED journey of 6-8 items that forms a coherent pedagogical progression.

CRITICAL REQUIREMENTS:
1. START ACCESSIBLE: Begin with the most approachable, engaging entry point
2. BUILD COMPLEXITY: Each item should prepare the viewer/reader for the next
3. TEACH PROGRESSIVELY: Introduce concepts/techniques gradually
4. SHOW EVOLUTION: Include mix of eras/styles showing how the genre/topic developed
5. EXPLAIN TRANSITIONS: Every "transitionToNext" must be specific and insightful
6. RESPECT CONSTRAINTS: If the user query specifies a rating (e.g., "> 8"), year, or popularity, YOU MUST STRICTLY ADHERE TO IT. Do not recommend items that violate these explicit constraints.
7. QUALITY CONTROL: If the user query specifies "popular", "highly rated", or "high ratings", YOU MUST ONLY INCLUDE ITEMS WITH A MATURE CRITICAL CONSENSUS (e.g., IMDB > 7.5 or Rotten Tomatoes > 80%). Do not take risks on obscure or poorly rated titles for these requests.
8. Return ONLY valid JSON, no markdown, no code fences, no explanation
${typeFieldRule}
${onlyRecommendRule}

Response format (use exact field names):
{
  "journey_title": "Creative, evocative title for this journey",
  "description": "2-3 sentences about the journey arc and what the user will experience",
  "total_runtime_minutes": 0,
  "difficulty_progression": "e.g. accessible → challenging",
  "items": [
    {
      "position": 1,
      "title": "Exact title for API lookup",
      "creator": "Director/Showrunner/Author name",
      "year": 2020,
      "type": "${exampleType}",
      "description": "Why this fits the query - contextual explanation",
      "genres": ["Genre1", "Genre2"],
      "whyThisPosition": "If position 1: why start here. Otherwise: why this comes after the previous",
      "whatYoullLearn": "Specific techniques, themes, or concepts introduced",
      "keyThemes": ["theme1", "theme2", "theme3"],
      "difficultyLevel": "beginner",
      "ratingScore": 8.5,
      "popularityScore": 90,
      "transitionToNext": "Explanation of what the NEXT item will add. Use null for the last item."
    }
  ]
}

For "difficultyLevel" use exactly: "beginner" | "intermediate" | "advanced"
For "transitionToNext" use null for the last item, string for all others.`;
}
