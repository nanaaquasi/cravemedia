import { ContentType } from "./types";
import { ENABLED_MEDIA_TYPES, getTypeLabel } from "@/config/media-types";

function getTypeFieldRule(): string {
  const types = ENABLED_MEDIA_TYPES.map((t) => `"${t}"`).join(" or ");
  return `- For the "type" field, use exactly: ${types}`;
}

export function getSystemPrompt(type: ContentType | ContentType[]): string {
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

  return `You are an expert media curator with encyclopedic knowledge of ${typeLabel}. 
Given a user's natural language query describing themes, moods, styles, or preferences, 
generate a curated collection of 15-20 recommendations.

IMPORTANT RULES:
- Return ONLY valid JSON, no markdown, no code fences, no explanation
- Include a mix of well-known and lesser-known titles
- Each recommendation must have a contextual description explaining WHY it fits the query
- BE CREATIVE: Make the collection title evocative and fitting. Keep it SHORT: 3-6 words max (e.g. "Cozy Rainy Day Picks", "Mind-Bending Sci-Fi").
- QUALITY CONTROL: If the user query specifies "popular", "highly rated", or "high ratings", YOU MUST ONLY INCLUDE ITEMS WITH A MATURE CRITICAL CONSENSUS (e.g., IMDB > 7.5 or Rotten Tomatoes > 80%). Do not take risks on obscure or poorly rated titles for these requests.
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
