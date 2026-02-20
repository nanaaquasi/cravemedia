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
): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for OpenAI provider");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const completion = await client.chat.completions.create({
    model,
    max_tokens: 3000,
    temperature: 0.7,
    messages: [
      { role: "system", content: getSystemPrompt(type) },
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
): Promise<JourneyAIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for OpenAI provider");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const completion = await client.chat.completions.create({
    model,
    max_tokens: 4000,
    temperature: 0.7,
    messages: [
      { role: "system", content: getJourneySystemPrompt(type) },
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
      { role: "system", content: getRefineSystemPrompt(type, previousAnswers) },
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
