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
    maxOutputTokens?: number;
    temperature?: number;
    responseMimeType?: string;
  } = {},
): Promise<AIResponse> {
  const provider = getProvider();

  switch (provider) {
    case "gemini":
      return generateWithGemini(query, type, options);
    case "openai":
      return generateWithOpenAI(query, type);
    case "anthropic":
      return generateWithAnthropic(query, type);
    default:
      return generateWithGemini(query, type, options);
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
    maxOutputTokens?: number;
    temperature?: number;
    responseMimeType?: string;
  } = {},
): Promise<JourneyAIResponse> {
  const provider = process.env.AI_PROVIDER || "gemini";
  let raw: JourneyAIResponse;

  switch (provider) {
    case "openai":
      raw = await generateJourneyWithOpenAI(query, type);
      break;
    case "anthropic":
      raw = await generateJourneyWithAnthropic(query, type);
      break;
    case "gemini":
    default:
      raw = await generateJourneyWithGemini(query, type, options);
  }

  return normalizeJourneyResponse(raw);
}

export async function generateRefineQuestions(
  query: string,
  type: ContentType | ContentType[],
  previousAnswers: RefineAnswer[],
): Promise<RefineResponse> {
  const provider = process.env.AI_PROVIDER || "gemini";

  switch (provider) {
    case "openai":
      return generateRefineWithOpenAI(query, type, previousAnswers);
    case "anthropic":
      return generateRefineWithAnthropic(query, type, previousAnswers);
    case "gemini":
    default:
      return generateRefineWithGemini(query, type, previousAnswers);
  }
}
