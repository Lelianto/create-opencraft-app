import "server-only";

/**
 * Fixed-window rate limiter.
 *
 * ## Honest limitation — read this before relying on it
 *
 * State lives in a module-level `Map`, which means it is **per process**:
 *
 * - On serverless (Vercel, Lambda) every cold start gets an empty map, and
 *   concurrent instances each keep their own counters. An attacker with N
 *   instances effectively gets N× the limit.
 * - It resets on every deploy.
 * - It does not work across regions.
 *
 * It is genuinely useful for a single long-lived Node server, and as a cheap
 * brake against accidental hammering. It is **not** a defence against a
 * determined distributed attacker.
 *
 * For production, swap the two functions below for a shared store — Upstash Redis
 * or Vercel KV — keeping this same signature:
 *
 * ```ts
 * const { success } = await ratelimit.limit(key);
 * return { allowed: success, remaining: 0, resetAt: 0 };
 * ```
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Epoch milliseconds when the current window ends. */
  resetAt: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Drop expired buckets so the map cannot grow without bound. */
function evictExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Consume one unit against `key`.
 *
 * Key by authenticated user id wherever possible. An IP address is a weak key:
 * it is shared behind NAT and trivially rotated by an attacker. Never key on a
 * client-supplied header.
 */
export function checkRateLimit(key: string, limit = 20, windowMs = 60_000): RateLimitResult {
  const now = Date.now();

  // Cheap opportunistic cleanup; avoids a timer and keeps this synchronous.
  if (buckets.size > 10_000) evictExpired(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/** Standard headers so clients can back off politely. */
export function rateLimitHeaders(result: RateLimitResult, limit = 20): Record<string, string> {
  return {
    "RateLimit-Limit": String(limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.max(0, Math.ceil((result.resetAt - Date.now()) / 1000))),
  };
}
