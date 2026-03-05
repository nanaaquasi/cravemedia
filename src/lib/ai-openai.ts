import OpenAI from "openai";
import {
  AIResponse,
  ContentType,
  JourneyAIResponse,
  RefineAnswer,
  RefineResponse,
} from "./types";
import { getSystemPrompt } from "./ai-prompts";
import { getJourneySystemPrompt } from "./ai-journey-prompts";
import { getRefineSystemPrompt } from "./ai-refine-prompts";
import { cleanAndParseJSON } from "./ai-utils";

export async function generateWithOpenAI(
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for OpenAI provider");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const completion = await client.chat.completions.create({
    model,
    max_tokens: options.maxOutputTokens || 3000,
    temperature: options.temperature ?? 0.7,
    messages: [
      {
        role: "system",
        content: getSystemPrompt(type, {
          excludeTitles: options.excludeTitles,
          userContext: options.userContext,
          streamingServiceOnly: options.streamingServiceOnly,
        }),
      },
      { role: "user", content: query },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  return cleanAndParseJSON<AIResponse>(content);
}

export async function generateJourneyWithOpenAI(
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for OpenAI provider");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const completion = await client.chat.completions.create({
    model,
    max_tokens: options.maxOutputTokens || 4000,
    temperature: options.temperature ?? 0.7,
    messages: [
      {
        role: "system",
        content: getJourneySystemPrompt(type, {
          excludeTitles: options.excludeTitles,
          userContext: options.userContext,
          streamingServiceOnly: options.streamingServiceOnly,
        }),
      },
      { role: "user", content: query },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  return cleanAndParseJSON<JourneyAIResponse>(content);
}

export async function generateRefineWithOpenAI(
  query: string,
  type: ContentType | ContentType[],
  previousAnswers: RefineAnswer[],
  options?: {
    userContext?: import("./types").UserRecommendContext;
    streamingServiceInQuery?: string | null;
  },
): Promise<RefineResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for OpenAI provider");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const completion = await client.chat.completions.create({
    model,
    max_tokens: 2000,
    temperature: 0.8,
    messages: [
      {
        role: "system",
        content: getRefineSystemPrompt(type, previousAnswers, {
          userContext: options?.userContext,
          streamingServiceInQuery: options?.streamingServiceInQuery,
        }),
      },
      { role: "user", content: query },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  return cleanAndParseJSON<RefineResponse>(content);
}
