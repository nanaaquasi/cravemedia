import {
  AIResponse,
  ContentType,
  JourneyAIResponse,
  RefineAnswer,
  RefineResponse,
} from "./types";
import {
  generateWithGemini,
  generateJourneyWithGemini,
  generateRefineWithGemini,
} from "./ai-gemini";
import {
  generateWithOpenAI,
  generateJourneyWithOpenAI,
  generateRefineWithOpenAI,
} from "./ai-openai";
import {
  generateWithAnthropic,
  generateJourneyWithAnthropic,
  generateRefineWithAnthropic,
} from "./ai-anthropic";
import { withRetry } from "./ai-retry";

export type AIProvider = "gemini" | "openai" | "anthropic";

function getProvider(): AIProvider {
  const env = process.env.AI_PROVIDER?.toLowerCase();
  if (env === "gemini" || env === "openai" || env === "anthropic") {
    return env;
  }
  return "gemini";
}

export async function generateRecommendations(
  query: string,
  type: ContentType | ContentType[],
  options: {
    excludeTitles?: string[];
    userContext?: import("./types").UserRecommendContext;
    streamingServiceOnly?: string | null;
    maxOutputTokens?: number;
    temperature?: number;
    responseMimeType?: string;
  } = {},
): Promise<AIResponse> {
  const provider = getProvider();

  switch (provider) {
    case "gemini":
      return withRetry(() => generateWithGemini(query, type, options));
    case "openai":
      return withRetry(() => generateWithOpenAI(query, type, options));
    case "anthropic":
      return withRetry(() => generateWithAnthropic(query, type, options));
    default:
      return withRetry(() => generateWithGemini(query, type, options));
  }
}

function normalizeJourneyResponse(raw: JourneyAIResponse): JourneyAIResponse {
  return {
    journey_title: raw.journey_title ?? raw.journeyTitle,
    description: raw.description,
    total_runtime_minutes: raw.total_runtime_minutes ?? raw.totalRuntimeMinutes,
    difficulty_progression:
      raw.difficulty_progression ?? raw.difficultyProgression ?? "",
    items: raw.items,
  };
}

export async function generateJourney(
  query: string,
  type: ContentType | ContentType[],
  options: {
    excludeTitles?: string[];
    userContext?: import("./types").UserRecommendContext;
    streamingServiceOnly?: string | null;
    maxOutputTokens?: number;
    temperature?: number;
    responseMimeType?: string;
  } = {},
): Promise<JourneyAIResponse> {
  const provider = process.env.AI_PROVIDER || "gemini";
  let raw: JourneyAIResponse;

  switch (provider) {
    case "openai":
      raw = await withRetry(() =>
        generateJourneyWithOpenAI(query, type, options),
      );
      break;
    case "anthropic":
      raw = await withRetry(() =>
        generateJourneyWithAnthropic(query, type, options),
      );
      break;
    case "gemini":
    default:
      raw = await withRetry(() =>
        generateJourneyWithGemini(query, type, options),
      );
  }

  return normalizeJourneyResponse(raw);
}

export async function generateRefineQuestions(
  query: string,
  type: ContentType | ContentType[],
  previousAnswers: RefineAnswer[],
  options?: {
    userContext?: import("./types").UserRecommendContext;
    streamingServiceInQuery?: string | null;
  },
): Promise<RefineResponse> {
  const provider = process.env.AI_PROVIDER || "gemini";

  switch (provider) {
    case "openai":
      return withRetry(() =>
        generateRefineWithOpenAI(query, type, previousAnswers, options),
      );
    case "anthropic":
      return withRetry(() =>
        generateRefineWithAnthropic(query, type, previousAnswers, options),
      );
    case "gemini":
    default:
      return withRetry(() =>
        generateRefineWithGemini(query, type, previousAnswers, options),
      );
  }
}
