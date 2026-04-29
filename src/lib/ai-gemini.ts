import { GoogleGenAI } from "@google/genai";
import {
  AIResponse,
  ContentType,
  JourneyAIResponse,
  PromoteItem,
  ReferenceTitle,
  RefineAnswer,
  RefineResponse,
} from "./types";
import { getSystemPrompt } from "./ai-prompts";
import {
  buildJourneyFromListUserMessage,
  getJourneyFromListPrompt,
  getJourneySystemPrompt,
} from "./ai-journey-prompts";
import { getRefineSystemPrompt } from "./ai-refine-prompts";
import { cleanAndParseJSON } from "./ai-utils";

export async function generateWithGemini(
  query: string,
  type: ContentType | ContentType[],
  options: {
    excludeTitles?: string[];
    userContext?: import("./types").UserRecommendContext;
    streamingServiceOnly?: string | null;
    referenceTitles?: ReferenceTitle[];
    maxOutputTokens?: number;
    temperature?: number;
    responseMimeType?: string;
  } = {},
): Promise<AIResponse> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is required for Gemini provider");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model,
    contents: query,
    config: {
      systemInstruction: getSystemPrompt(type, {
        excludeTitles: options.excludeTitles,
        userContext: options.userContext,
        streamingServiceOnly: options.streamingServiceOnly,
        referenceTitles: options.referenceTitles,
      }),
      maxOutputTokens: options.maxOutputTokens || 3000,
      temperature: options.temperature ?? 0.4,
      responseMimeType: options.responseMimeType || "application/json",
    },
  });

  const text = response.text ?? "";
  if (!text) {
    throw new Error("No text response from Gemini");
  }

  return cleanAndParseJSON<AIResponse>(text);
}

export async function generateJourneyWithGemini(
  query: string,
  type: ContentType | ContentType[],
  options: {
    excludeTitles?: string[];
    userContext?: import("./types").UserRecommendContext;
    streamingServiceOnly?: string | null;
    referenceTitles?: ReferenceTitle[];
    maxOutputTokens?: number;
    temperature?: number;
    responseMimeType?: string;
  } = {},
): Promise<JourneyAIResponse> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is required for Gemini provider");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model,
    contents: query,
    config: {
      systemInstruction: getJourneySystemPrompt(type, {
        excludeTitles: options.excludeTitles,
        userContext: options.userContext,
        streamingServiceOnly: options.streamingServiceOnly,
        referenceTitles: options.referenceTitles,
      }),
      maxOutputTokens: options.maxOutputTokens || 4000,
      temperature: options.temperature ?? 0.4,
      responseMimeType: options.responseMimeType || "application/json",
    },
  });

  const text = response.text ?? "";
  if (!text) {
    throw new Error("No text response from Gemini");
  }

  return cleanAndParseJSON<JourneyAIResponse>(text);
}

export async function generateJourneyFromListWithGemini(
  items: PromoteItem[],
  type: ContentType | ContentType[],
  options: {
    collectionName: string;
    collectionDescription?: string | null;
    maxItems?: number;
    userContext?: import("./types").UserRecommendContext;
    maxOutputTokens?: number;
    temperature?: number;
    responseMimeType?: string;
  },
): Promise<JourneyAIResponse> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is required for Gemini provider");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const ai = new GoogleGenAI({ apiKey });

  const userMessage = buildJourneyFromListUserMessage(
    items,
    options.collectionName,
    options.collectionDescription,
  );

  const response = await ai.models.generateContent({
    model,
    contents: userMessage,
    config: {
      systemInstruction: getJourneyFromListPrompt(type, {
        maxItems: options.maxItems,
        userContext: options.userContext,
        inputItemCount: items.length,
      }),
      maxOutputTokens: options.maxOutputTokens || 6000,
      temperature: options.temperature ?? 0.4,
      responseMimeType: options.responseMimeType || "application/json",
    },
  });

  const text = response.text ?? "";
  if (!text) {
    throw new Error("No text response from Gemini");
  }

  return cleanAndParseJSON<JourneyAIResponse>(text);
}

export async function generateRefineWithGemini(
  query: string,
  type: ContentType | ContentType[],
  previousAnswers: RefineAnswer[],
  options?: {
    userContext?: import("./types").UserRecommendContext;
    streamingServiceInQuery?: string | null;
  },
): Promise<RefineResponse> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is required for Gemini provider");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model,
    contents: query,
    config: {
      systemInstruction: getRefineSystemPrompt(type, previousAnswers, {
        userContext: options?.userContext,
        streamingServiceInQuery: options?.streamingServiceInQuery,
      }),
      maxOutputTokens: 2000,
      temperature: 0.8,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                text: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                multiSelect: { type: "boolean" },
              },
              required: ["id", "text", "options", "multiSelect"],
            },
          },
          isComplete: { type: "boolean" },
          refinedQuery: { type: "string", nullable: true },
        },
        required: ["questions", "isComplete"],
      },
    },
  });

  const text = response.text ?? "";
  if (!text) {
    throw new Error("No text response from Gemini");
  }

  return cleanAndParseJSON<RefineResponse>(text);
}
