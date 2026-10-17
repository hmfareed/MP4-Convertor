import { getRedisConnection } from "@/lib/queue/redis";
import { NextResponse } from "next/server";

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSec: number;
  retryAfterSec: number;
}

/**
 * Sliding-window rate limiter powered by Redis sorted sets (ZSET).
 * Ensures smooth, fair rate-limiting across distributed server instances.
 */
export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, windowSec } = options;
  const redisKey = `ratelimit:${key}`;
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const clearBefore = now - windowMs;

  try {
    const redis = getRedisConnection();

    // Redis Multi/Pipeline for atomic sliding window check
    const multi = redis.multi();
    multi.zremrangebyscore(redisKey, 0, clearBefore);
    multi.zcard(redisKey);
    multi.expire(redisKey, windowSec + 5);

    const results = await multi.exec();

    // Index 1 has zcard result
    const currentCount = (results?.[1]?.[1] as number) || 0;

    if (currentCount >= limit) {
      // Limit exceeded
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetSec: windowSec,
        retryAfterSec: Math.max(1, Math.ceil(windowSec)),
      };
    }

    // Add current request timestamp
    const member = `${now}:${Math.random().toString(36).slice(2, 9)}`;
    const addMulti = redis.multi();
    addMulti.zadd(redisKey, now, member);
    addMulti.expire(redisKey, windowSec + 5);
    await addMulti.exec();

    const remaining = Math.max(0, limit - (currentCount + 1));

    return {
      allowed: true,
      limit,
      remaining,
      resetSec: windowSec,
      retryAfterSec: 0,
    };
  } catch (err) {
    // Fail-open strategy with logging to protect service availability during Redis degradation
    console.warn(`[RateLimit] Redis error for key '${redisKey}', failing open:`, err);
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetSec: windowSec,
      retryAfterSec: 0,
    };
  }
}

/**
 * Extract client IP address safely from standard proxy headers
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}

/**
 * Construct standard RFC-compliant 429 Too Many Requests response
 */
export function rateLimitExceededResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: `Too many requests. Please wait ${retryAfterSec}s before retrying.`,
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Reset": String(retryAfterSec),
      },
    }
  );
}
