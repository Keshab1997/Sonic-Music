/**
 * Simple in-memory rate limiter for Vercel serverless functions
 * Uses a Map to track request counts per IP/key within time windows
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}, 300000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const defaultRateLimits: Record<string, RateLimitConfig> = {
  "/api/youtube-search": { maxRequests: 120, windowMs: 60000 }, // 120 req/min
  "/api/yt-stream": { maxRequests: 100, windowMs: 60000 }, // 100 req/min
  "/api/proxy-yt-download": { maxRequests: 30, windowMs: 60000 }, // 30 req/min
  "/api/proxy-audio": { maxRequests: 100, windowMs: 60000 }, // 100 req/min
};

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetTime < now) {
    // New window
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

export function getRateLimitHeaders(remaining: number, resetTime: number) {
  return {
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.floor(resetTime / 1000)),
    "Retry-After": String(Math.max(1, Math.ceil((resetTime - Date.now()) / 1000))),
  };
}
