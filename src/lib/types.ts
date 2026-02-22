export type ContentType = "movie" | "tv" | "book" | "anime" | "all";

export interface AIRecommendation {
  title: string;
  creator: string;
  year: number;
  type: "movie" | "tv" | "book" | "anime";
  description: string;
  genres: string[];
  ratingScore?: number;
  popularityScore?: number;
}

export interface AIResponse {
  collectionTitle: string;
  collectionDescription: string;
  items: AIRecommendation[];
}

export interface EnrichedRecommendation extends AIRecommendation {
  posterUrl: string | null;
  rating: number | null;
  ratingSource: string | null;
  runtime: string | null;
  externalId: string | null;
  aiRating?: number;
  aiPopularity?: number;
  /** ID of collection_items row when item is from a saved collection */
  collectionItemId?: string;
}

export interface RecommendationResponse {
  collectionTitle: string;
  collectionDescription: string;
  items: EnrichedRecommendation[];
  itemCount: number;
}

export interface SavedList {
  id: string;
  name: string;
  description: string;
  items: EnrichedRecommendation[];
  createdAt: string;
  updatedAt: string;
  isPublic?: boolean;
  isJourney?: boolean;
  journeyMetadata?: Array<{
    position: number;
    whyThisPosition: string;
    whatYoullLearn: string;
    transitionToNext: string | null;
    difficultyLevel: string;
  }>;
}

// Journey-specific (AI output before enrichment)
export interface JourneyItemRaw {
  position: number;
  title: string;
  creator: string;
  year: number;
  type: "movie" | "tv" | "book" | "anime";
  description?: string;
  genres?: string[];
  whyThisPosition: string;
  whatYoullLearn: string;
  keyThemes: string[];
  difficultyLevel: "beginner" | "intermediate" | "advanced";
  ratingScore?: number;
  popularityScore?: number;
  transitionToNext: string | null;
}

// Enriched journey item (after TMDB/books lookup)
export interface JourneyItem extends EnrichedRecommendation {
  position: number;
  whyThisPosition: string;
  whatYoullLearn: string;
  keyThemes: string[];
  difficultyLevel: string;
  transitionToNext: string | null;
}

export interface JourneyResponse {
  journeyTitle: string;
  description: string;
  totalRuntimeMinutes?: number;
  difficultyProgression: string;
  items: JourneyItem[];
  itemCount: number;
}

// Raw AI output (may use snake_case from model)
export interface JourneyAIResponse {
  journey_title?: string;
  journeyTitle?: string;
  description: string;
  total_runtime_minutes?: number;
  totalRuntimeMinutes?: number;
  difficulty_progression?: string;
  difficultyProgression?: string;
  items: JourneyItemRaw[];
}

// Intent refinement types
export interface RefineQuestion {
  id: string;
  text: string;
  options: string[];
  multiSelect: boolean;
}

export interface RefineAnswer {
  questionId: string;
  questionText: string;
  selected: string[];
}

export interface RefineResponse {
  questions: RefineQuestion[];
  isComplete: boolean;
  refinedQuery?: string;
}
