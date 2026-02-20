import Anthropic from "@anthropic-ai/sdk";
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

export async function generateWithAnthropic(
  query: string,
  type: ContentType | ContentType[],
): Promise<AIResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for Anthropic provider");
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";

  const message = await client.messages.create({
    model,
    max_tokens: 3000,
    temperature: 0.7,
    system: getSystemPrompt(type),
    messages: [{ role: "user", content: query }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (textBlock?.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return cleanAndParseJSON<AIResponse>(textBlock.text);
}

export async function generateJourneyWithAnthropic(
  query: string,
  type: ContentType | ContentType[],
): Promise<JourneyAIResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for Anthropic provider");
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";

  const message = await client.messages.create({
    model,
    max_tokens: 4000,
    temperature: 0.7,
    system: getJourneySystemPrompt(type),
    messages: [{ role: "user", content: query }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (textBlock?.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return cleanAndParseJSON<JourneyAIResponse>(textBlock.text);
}

export async function generateRefineWithAnthropic(
  query: string,
  type: ContentType | ContentType[],
  previousAnswers: RefineAnswer[],
): Promise<RefineResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for Anthropic provider");
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";

  const message = await client.messages.create({
    model,
    max_tokens: 2000,
    temperature: 0.8,
    system: getRefineSystemPrompt(type, previousAnswers),
    messages: [{ role: "user", content: query }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (textBlock?.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return cleanAndParseJSON<RefineResponse>(textBlock.text);
}
