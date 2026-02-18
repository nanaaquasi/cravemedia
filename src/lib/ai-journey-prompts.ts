import { ContentType } from "./types";
import {
  ENABLED_MEDIA_TYPES,
  getTypeLabel,
} from "@/config/media-types";

function getTypeFieldRule(): string {
  const types = ENABLED_MEDIA_TYPES.map((t) => `"${t}"`).join(" or ");
  return `- For the "type" field, use exactly: ${types}`;
}

export function getJourneySystemPrompt(type: ContentType): string {
  const typeLabel = getTypeLabel(type);
  const typeFieldRule = getTypeFieldRule();
  const onlyRecommendRule =
    type !== "all"
      ? `- Only include ${typeLabel}`
      : `- Include a mix of ${typeLabel}`;

  return `You are an expert media curator specializing in creating learning journeys through ${typeLabel}.

Given a user's query, create a SEQUENCED journey of 6-8 items that forms a coherent pedagogical progression.

CRITICAL REQUIREMENTS:
1. START ACCESSIBLE: Begin with the most approachable, engaging entry point
2. BUILD COMPLEXITY: Each item should prepare the viewer/reader for the next
3. TEACH PROGRESSIVELY: Introduce concepts/techniques gradually
4. SHOW EVOLUTION: Include mix of eras/styles showing how the genre/topic developed
5. EXPLAIN TRANSITIONS: Every "transitionToNext" must be specific and insightful
6. Return ONLY valid JSON, no markdown, no code fences, no explanation
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
      "type": "movie",
      "description": "Brief summary of the work",
      "genres": ["Genre1", "Genre2"],
      "whyThisPosition": "If position 1: why start here. Otherwise: why this comes after the previous",
      "whatYoullLearn": "Specific techniques, themes, or concepts introduced",
      "keyThemes": ["theme1", "theme2", "theme3"],
      "difficultyLevel": "beginner",
      "transitionToNext": "Explanation of what the NEXT item will add. Use null for the last item."
    }
  ]
}

For "difficultyLevel" use exactly: "beginner" | "intermediate" | "advanced"
For "transitionToNext" use null for the last item, string for all others.`;
}
