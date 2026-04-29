import {
  AIResponse,
  ContentType,
  JourneyAIResponse,
  PromoteItem,
  RefineAnswer,
  RefineResponse,
} from "./types";
import {
  generateWithGemini,
  generateJourneyWithGemini,
  generateJourneyFromListWithGemini,
  generateRefineWithGemini,
} from "./ai-gemini";
import {
  generateWithOpenAI,
  generateJourneyWithOpenAI,
  generateJourneyFromListWithOpenAI,
  generateRefineWithOpenAI,
} from "./ai-openai";
import {
  generateWithAnthropic,
  generateJourneyWithAnthropic,
  generateJourneyFromListWithAnthropic,
  generateRefineWithAnthropic,
} from "./ai-anthropic";
import { withRetry } from "./ai-retry";

export type AIProvider = "gemini" | "openai" | "anthropic";

/**
 * Status codes that signal a hard quota / billing problem with the current
 * provider. We fall back to the next provider immediately on these — retrying
 * the same provider won't help.
 */
const QUOTA_STATUS_CODES = new Set([429, 402, 403]);
/** Status codes worth retrying on the SAME provider before falling back. */
const TRANSIENT_STATUS_CODES = new Set([502, 503, 504, 529]);

function isProviderConfigured(provider: AIProvider): boolean {
  switch (provider) {
    case "gemini":
      return Boolean(process.env.GOOGLE_AI_API_KEY);
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY);
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY);
  }
}

function parseProvider(value: string | undefined | null): AIProvider | null {
  const v = value?.toLowerCase();
  if (v === "gemini" || v === "openai" || v === "anthropic") return v;
  return null;
}

/** Default provider (used when no per-task override is set). */
function getDefaultProvider(): AIProvider {
  return parseProvider(process.env.AI_PROVIDER) ?? "gemini";
}

/**
 * Resolve the provider to use for a specific task. Allows per-task overrides
 * via env (e.g. `AI_LIST_PROVIDER=gemini`, `AI_JOURNEY_PROVIDER=anthropic`)
 * with a fallback to the global `AI_PROVIDER`. Lets us use a fast model for
 * the bulky list path and a higher-quality model for narrative journeys.
 */
function getProviderForTask(
  task: "list" | "journey" | "refine" | "promote",
): AIProvider {
  const envKey = {
    list: "AI_LIST_PROVIDER",
    journey: "AI_JOURNEY_PROVIDER",
    refine: "AI_REFINE_PROVIDER",
    promote: "AI_PROMOTE_PROVIDER",
  }[task];
  return parseProvider(process.env[envKey]) ?? getDefaultProvider();
}

/** Status extraction for fallback decisioning (mirrors ai-retry shape). */
function getStatusFromError(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const o = err as Record<string, unknown>;
  if (typeof o.status === "number") return o.status;
  if (typeof o.statusCode === "number") return o.statusCode;
  const res = o.response as Record<string, unknown> | undefined;
  if (res && typeof res.status === "number") return res.status;
  if (err instanceof Error && err.cause && typeof err.cause === "object") {
    const c = err.cause as Record<string, unknown>;
    if (typeof c.status === "number") return c.status;
  }
  return undefined;
}

function shouldFallback(err: unknown): boolean {
  const status = getStatusFromError(err);
  if (status !== undefined && QUOTA_STATUS_CODES.has(status)) return true;
  // Non-status quota error messages from SDKs.
  const message = err instanceof Error ? err.message.toLowerCase() : "";
  return /quota|exhaust|rate ?limit|too many requests|insufficient/i.test(
    message,
  );
}

/** Determines if we should retry the SAME provider (transient infra issues). */
function shouldRetrySameProvider(err: unknown): boolean {
  const status = getStatusFromError(err);
  return status !== undefined && TRANSIENT_STATUS_CODES.has(status);
}

/**
 * Build a fallback chain: preferred provider first, then any other
 * configured providers, deduped. Skips providers without API keys.
 */
function buildProviderChain(preferred: AIProvider): AIProvider[] {
  const all: AIProvider[] = ["gemini", "anthropic", "openai"];
  const ordered = [preferred, ...all.filter((p) => p !== preferred)];
  return ordered.filter(isProviderConfigured);
}

type ProviderRunner<T> = (provider: AIProvider) => Promise<T>;

/**
 * Try the preferred provider first, falling back to other configured
 * providers when the request fails with a quota/rate-limit style error.
 * Each provider call is wrapped in `withRetry` for transient errors.
 */
async function callWithProviderFallback<T>(
  preferred: AIProvider,
  runner: ProviderRunner<T>,
  taskLabel: string,
): Promise<T> {
  const chain = buildProviderChain(preferred);
  if (chain.length === 0) {
    throw new Error(
      `No AI provider is configured. Set GOOGLE_AI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.`,
    );
  }

  let lastError: unknown;
  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i];
    try {
      // Only retry on transient infra errors (502/503/504/529). Quota errors
      // (429/402/403) should fall through to the next provider immediately —
      // retrying the same key won't help and just wastes time.
      return await withRetry(() => runner(provider), {
        isRetryable: shouldRetrySameProvider,
      });
    } catch (err) {
      lastError = err;
      const isLast = i === chain.length - 1;
      if (isLast || !shouldFallback(err)) {
        throw err;
      }
      const status = getStatusFromError(err);
      console.warn(
        `[${taskLabel}] provider "${provider}" hit quota/rate limit (status ${status ?? "n/a"}). Falling back to "${chain[i + 1]}"...`,
      );
    }
  }
  throw lastError;
}

export async function generateRecommendations(
  query: string,
  type: ContentType | ContentType[],
  options: {
    excludeTitles?: string[];
    userContext?: import("./types").UserRecommendContext;
    streamingServiceOnly?: string | null;
    referenceTitles?: import("./types").ReferenceTitle[];
    maxOutputTokens?: number;
    temperature?: number;
    responseMimeType?: string;
  } = {},
): Promise<AIResponse> {
  return callWithProviderFallback(
    getProviderForTask("list"),
    (provider) => {
      switch (provider) {
        case "gemini":
          return generateWithGemini(query, type, options);
        case "openai":
          return generateWithOpenAI(query, type, options);
        case "anthropic":
          return generateWithAnthropic(query, type, options);
      }
    },
    "generateRecommendations",
  );
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
    referenceTitles?: import("./types").ReferenceTitle[];
    maxOutputTokens?: number;
    temperature?: number;
    responseMimeType?: string;
  } = {},
): Promise<JourneyAIResponse> {
  const raw = await callWithProviderFallback(
    getProviderForTask("journey"),
    (provider) => {
      switch (provider) {
        case "gemini":
          return generateJourneyWithGemini(query, type, options);
        case "openai":
          return generateJourneyWithOpenAI(query, type, options);
        case "anthropic":
          return generateJourneyWithAnthropic(query, type, options);
      }
    },
    "generateJourney",
  );
  return normalizeJourneyResponse(raw);
}

export async function generateJourneyFromList(
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
  const raw = await callWithProviderFallback(
    getProviderForTask("promote"),
    (provider) => {
      switch (provider) {
        case "gemini":
          return generateJourneyFromListWithGemini(items, type, options);
        case "openai":
          return generateJourneyFromListWithOpenAI(items, type, options);
        case "anthropic":
          return generateJourneyFromListWithAnthropic(items, type, options);
      }
    },
    "generateJourneyFromList",
  );
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
  return callWithProviderFallback(
    getProviderForTask("refine"),
    (provider) => {
      switch (provider) {
        case "gemini":
          return generateRefineWithGemini(query, type, previousAnswers, options);
        case "openai":
          return generateRefineWithOpenAI(query, type, previousAnswers, options);
        case "anthropic":
          return generateRefineWithAnthropic(query, type, previousAnswers, options);
      }
    },
    "generateRefineQuestions",
  );
}
