import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function getClientIP(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "anonymous";
  }
  const realIp = headers.get("x-real-ip");
  return realIp ?? "anonymous";
}

let recommendLimiter: Ratelimit | null = null;
let refineLimiter: Ratelimit | null = null;

function getRecommendLimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!recommendLimiter) {
    const redis = new Redis({ url, token });
    recommendLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
    });
  }
  return recommendLimiter;
}

function getRefineLimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!refineLimiter) {
    const redis = new Redis({ url, token });
    refineLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      analytics: true,
    });
  }
  return refineLimiter;
}

export async function checkRecommendRateLimit(
  headers: Headers,
): Promise<{ success: true } | { success: false; status: number }> {
  const limiter = getRecommendLimiter();
  if (!limiter) return { success: true };
  const identifier = `recommend:${getClientIP(headers)}`;
  const result = await limiter.limit(identifier);
  if (!result.success) {
    return { success: false, status: 429 };
  }
  return { success: true };
}

export async function checkRefineRateLimit(
  headers: Headers,
): Promise<{ success: true } | { success: false; status: number }> {
  const limiter = getRefineLimiter();
  if (!limiter) return { success: true };
  const identifier = `refine:${getClientIP(headers)}`;
  const result = await limiter.limit(identifier);
  if (!result.success) {
    return { success: false, status: 429 };
  }
  return { success: true };
}
