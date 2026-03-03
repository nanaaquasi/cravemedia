const RETRYABLE_STATUS = [429, 502, 503, 504, 529] as const;
const MAX_RETRIES = 2; // 3 total attempts
const BASE_DELAY_MS = 1000;

function getStatus(err: unknown): number | undefined {
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

function isRetryable(err: unknown): boolean {
  const status = getStatus(err);
  return status !== undefined && (RETRYABLE_STATUS as readonly number[]).includes(status);
}

/**
 * Wraps an async function with retry logic for rate limit (429) and
 * temporary overload (503) errors. Uses exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; baseDelayMs?: number },
): Promise<T> {
  const maxRetries = options?.maxRetries ?? MAX_RETRIES;
  const baseDelayMs = options?.baseDelayMs ?? BASE_DELAY_MS;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (
        attempt < maxRetries &&
        isRetryable(err)
      ) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(
          `AI API temporary error (status ${getStatus(err)}) — attempt ${attempt + 1}/${maxRetries + 1}, retrying in ${delay}ms...`,
        );
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }

  throw lastError;
}
