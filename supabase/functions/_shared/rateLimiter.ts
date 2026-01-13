/**
 * Rate Limiter for Supabase Edge Functions
 *
 * Implements in-memory rate limiting per user/IP.
 * Note: For production scale, consider using Redis or a distributed cache.
 *
 * Usage:
 *   import { checkRateLimit, RateLimitResult } from '../_shared/rateLimiter.ts';
 *
 *   const result = checkRateLimit(userId, 10, 60000); // 10 requests per minute
 *   if (!result.allowed) {
 *     return errorResponse('RATE_LIMITED', result.message, 429, req);
 *   }
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory storage for rate limits
// Note: This resets when function instance restarts
const rateLimits = new Map<string, RateLimitEntry>();

// Clean up stale entries periodically
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60000; // 1 minute

function cleanupStaleEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetAt) {
      rateLimits.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // milliseconds until reset
  message: string;
}

/**
 * Check if a request should be allowed based on rate limits.
 *
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns RateLimitResult with allowed status and metadata
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): RateLimitResult {
  // Run cleanup occasionally
  cleanupStaleEntries();

  const now = Date.now();
  const entry = rateLimits.get(identifier);

  // First request or window expired
  if (!entry || now > entry.resetAt) {
    rateLimits.set(identifier, {
      count: 1,
      resetAt: now + windowMs
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetIn: windowMs,
      message: 'OK'
    };
  }

  // Check if limit exceeded
  if (entry.count >= limit) {
    const resetIn = entry.resetAt - now;
    const resetInSeconds = Math.ceil(resetIn / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetIn,
      message: `Rate limit exceeded. Try again in ${resetInSeconds} seconds.`
    };
  }

  // Increment counter
  entry.count++;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetIn: entry.resetAt - now,
    message: 'OK'
  };
}

/**
 * Get rate limit key from request (user ID or IP)
 */
export function getRateLimitKey(req: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Fallback to IP address
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');

  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0]?.trim() || 'unknown';
  return `ip:${ip}`;
}

/**
 * Preset rate limit configurations for common use cases
 */
export const RATE_LIMIT_PRESETS = {
  // Strict: 5 requests per minute (for expensive operations)
  strict: { limit: 5, windowMs: 60000 },

  // Normal: 20 requests per minute
  normal: { limit: 20, windowMs: 60000 },

  // Relaxed: 60 requests per minute
  relaxed: { limit: 60, windowMs: 60000 },

  // AI Generation: 3 requests per minute (expensive)
  aiGeneration: { limit: 3, windowMs: 60000 },

  // Auth: 5 attempts per 5 minutes (prevent brute force)
  auth: { limit: 5, windowMs: 300000 },
} as const;

/**
 * Helper to check rate limit using presets
 */
export function checkRateLimitWithPreset(
  identifier: string,
  preset: keyof typeof RATE_LIMIT_PRESETS
): RateLimitResult {
  const { limit, windowMs } = RATE_LIMIT_PRESETS[preset];
  return checkRateLimit(identifier, limit, windowMs);
}
