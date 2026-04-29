import Anthropic from "@anthropic-ai/sdk";
import {
  AIResponse,
  ContentType,
  JourneyAIResponse,
  PromoteItem,
  RefineAnswer,
  ReferenceTitle,
  RefineResponse,
} from "./types";
import { getSystemPromptParts } from "./ai-prompts";
import {
  buildJourneyFromListUserMessage,
  getJourneyFromListPrompt,
  getJourneySystemPromptParts,
} from "./ai-journey-prompts";
import { getRefineSystemPrompt } from "./ai-refine-prompts";
import { cleanAndParseJSON } from "./ai-utils";

/**
 * Default Claude model.
 *
 * `claude-sonnet-4-5` (Sept 2025 release) is meaningfully faster than 4.6 with
 * negligible quality loss for list-recommendation tasks, while keeping the
 * July 2025 knowledge cutoff. Override with CLAUDE_MODEL in env.
 */
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-6";

/**
 * Build the array-form `system` parameter with prompt-cache breakpoints.
 *
 * The static "cacheable" portion of the prompt (persona, rules, format,
 * JSON schema) is marked with `cache_control: { type: "ephemeral" }`. After
 * the first request, Anthropic stores it server-side for ~5 minutes — repeat
 * requests within that window pay ~10% of the input-token cost for the
 * cached portion AND see ~25–40% lower time-to-first-token.
 *
 * Anthropic requires the cacheable block to meet a minimum token threshold
 * (1024 for Sonnet/Opus). The dynamic suffix (user context, references,
 * exclusions) follows in a separate uncached block.
 */
function buildCachedSystemBlocks(parts: {
  cacheable: string;
  dynamic: string;
}) {
  const blocks: Array<{
    type: "text";
    text: string;
    cache_control?: { type: "ephemeral" };
  }> = [
    {
      type: "text",
      text: parts.cacheable,
      cache_control: { type: "ephemeral" },
    },
  ];
  if (parts.dynamic.trim().length > 0) {
    blocks.push({ type: "text", text: parts.dynamic });
  }
  return blocks;
}

export async function generateWithAnthropic(
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for Anthropic provider");
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.CLAUDE_MODEL || DEFAULT_CLAUDE_MODEL;

  const promptParts = getSystemPromptParts(type, {
    excludeTitles: options.excludeTitles,
    userContext: options.userContext,
    streamingServiceOnly: options.streamingServiceOnly,
    referenceTitles: options.referenceTitles,
  });

  const message = await client.messages.create({
    model,
    max_tokens: options.maxOutputTokens || 4500,
    temperature: options.temperature ?? 0.7,
    system: buildCachedSystemBlocks(promptParts),
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for Anthropic provider");
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.CLAUDE_MODEL || DEFAULT_CLAUDE_MODEL;

  const journeyParts = getJourneySystemPromptParts(type, {
    excludeTitles: options.excludeTitles,
    userContext: options.userContext,
    streamingServiceOnly: options.streamingServiceOnly,
    referenceTitles: options.referenceTitles,
  });

  const message = await client.messages.create({
    model,
    max_tokens: options.maxOutputTokens || 5000,
    temperature: options.temperature ?? 0.7,
    system: buildCachedSystemBlocks(journeyParts),
    messages: [{ role: "user", content: query }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (textBlock?.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return cleanAndParseJSON<JourneyAIResponse>(textBlock.text);
}

export async function generateJourneyFromListWithAnthropic(
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for Anthropic provider");
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.CLAUDE_MODEL || DEFAULT_CLAUDE_MODEL;

  const userMessage = buildJourneyFromListUserMessage(
    items,
    options.collectionName,
    options.collectionDescription,
  );

  const message = await client.messages.create({
    model,
    max_tokens: options.maxOutputTokens || 6000,
    temperature: options.temperature ?? 0.7,
    system: getJourneyFromListPrompt(type, {
      maxItems: options.maxItems,
      userContext: options.userContext,
      inputItemCount: items.length,
    }),
    messages: [{ role: "user", content: userMessage }],
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
  options?: {
    userContext?: import("./types").UserRecommendContext;
    streamingServiceInQuery?: string | null;
  },
): Promise<RefineResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for Anthropic provider");
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.CLAUDE_MODEL || DEFAULT_CLAUDE_MODEL;

  const message = await client.messages.create({
    model,
    max_tokens: 2000,
    temperature: 0.8,
    system: getRefineSystemPrompt(type, previousAnswers, {
      userContext: options?.userContext,
      streamingServiceInQuery: options?.streamingServiceInQuery,
    }),
    messages: [{ role: "user", content: query }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (textBlock?.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return cleanAndParseJSON<RefineResponse>(textBlock.text);
}
