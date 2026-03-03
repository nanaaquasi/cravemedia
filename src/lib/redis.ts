import { Redis } from "@upstash/redis";

let redisInstance: Redis | null = null;

/**
 * Lazy singleton Redis client. Returns null when UPSTASH env vars are missing.
 * Use for graceful degradation when Redis is unavailable.
 */
export function getRedis(): Redis | null {
  if (redisInstance) return redisInstance;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redisInstance = new Redis({ url, token });
  return redisInstance;
}
