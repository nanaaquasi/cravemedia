import { GoogleGenAI } from "@google/genai";
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

export async function generateWithGemini(
  query: string,
  type: ContentType | ContentType[],
  options: {
    excludeTitles?: string[];
    userContext?: import("./types").UserRecommendContext;
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

export async function generateRefineWithGemini(
  query: string,
  type: ContentType | ContentType[],
  previousAnswers: RefineAnswer[],
  options?: { userContext?: import("./types").UserRecommendContext },
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
      }),
      maxOutputTokens: 2000,
      temperature: 0.8,
      responseMimeType: "application/json",
    },
  });

  const text = response.text ?? "";
  if (!text) {
    throw new Error("No text response from Gemini");
  }

  return cleanAndParseJSON<RefineResponse>(text);
}
