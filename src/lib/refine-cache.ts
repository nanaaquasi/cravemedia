import { ContentType, RefineAnswer, RefineResponse } from "./types";
import { getRedis } from "./redis";

const REFINE_TTL_SEC = 30 * 60; // 30 minutes
const REDIS_KEY_PREFIX = "refine:";

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function getAnswersHash(previousAnswers: RefineAnswer[]): string {
  if (previousAnswers.length === 0) return "";
  const sorted = [...previousAnswers].sort((a, b) =>
    a.questionId.localeCompare(b.questionId),
  );
  return sorted
    .map((a) => `${a.questionId}:${a.selected.sort().join(",")}`)
    .join("|");
}

function getCacheKey(
  query: string,
  type: ContentType | ContentType[],
  previousAnswers: RefineAnswer[],
): string {
  const normalizedQuery = normalizeQuery(query);
  const typeStr = Array.isArray(type) ? type.sort().join(",") : type;
  const answersHash = getAnswersHash(previousAnswers);
  return `${REDIS_KEY_PREFIX}${typeStr}:${normalizedQuery}:${answersHash}`;
}

export async function getCachedRefine(
  query: string,
  type: ContentType | ContentType[],
  previousAnswers: RefineAnswer[],
): Promise<RefineResponse | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const key = getCacheKey(query, type, previousAnswers);
    const raw = await redis.get<string>(key);
    if (raw) {
      return JSON.parse(raw as string) as RefineResponse;
    }
  } catch {
    // Fall through
  }
  return null;
}

export async function setCachedRefine(
  query: string,
  type: ContentType | ContentType[],
  previousAnswers: RefineAnswer[],
  data: RefineResponse,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = getCacheKey(query, type, previousAnswers);
    await redis.set(key, JSON.stringify(data), { ex: REFINE_TTL_SEC });
  } catch {
    // Ignore cache write errors
  }
}
