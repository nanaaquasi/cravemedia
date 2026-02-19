import { ContentType } from "./types";
import { ENABLED_MEDIA_TYPES, getTypeLabel } from "@/config/media-types";

function getTypeFieldRule(): string {
  const types = ENABLED_MEDIA_TYPES.map((t) => `"${t}"`).join(" or ");
  return `- For the "type" field, use exactly: ${types}`;
}

export function getSystemPrompt(type: ContentType): string {
  const typeLabel = getTypeLabel(type);
  const typeFieldRule = getTypeFieldRule();
  const onlyRecommendRule =
    type !== "all"
      ? `- Only recommend ${typeLabel}`
      : `- Include a mix of ${typeLabel}`;

  return `You are an expert media curator with encyclopedic knowledge of ${typeLabel}. 
Given a user's natural language query describing themes, moods, styles, or preferences, 
generate a curated collection of 15-20 recommendations.

IMPORTANT RULES:
- Return ONLY valid JSON, no markdown, no code fences, no explanation
- Include a mix of well-known and lesser-known titles
- Each recommendation must have a contextual description explaining WHY it fits the query
- Be creative with the collection title - make it evocative and fitting
${typeFieldRule}
${onlyRecommendRule}

Response format:
{
  "collectionTitle": "An evocative title for this collection",
  "collectionDescription": "A brief 1-2 sentence description of the collection theme",
  "items": [
    {
      "title": "Title of the work",
      "creator": "Director/Showrunner/Author name",
      "year": 2020,
      "type": "${type === "all" ? "movie" : type}",
      "description": "Why this fits the query - contextual explanation",
      "genres": ["Genre1", "Genre2"]
    }
  ]
}`;
}
