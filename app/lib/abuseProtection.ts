/**
 * Abuse Protection & Rate Limiting Utility
 * Provides in-memory sliding-window rate limiting, honeypot verification,
 * and zero-PII logging helpers for public submission endpoints.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Clean up stale rate limit entries older than windowMs
 */
function cleanupExpiredEntries(now: number, windowMs: number) {
  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Checks whether an identifier (e.g. client IP) has exceeded the max allowed requests.
 * @param key Unique client identifier (e.g. IP or IP:endpoint)
 * @param maxRequests Maximum allowed requests in the time window (default 3)
 * @param windowMs Time window in milliseconds (default 10 minutes = 600,000 ms)
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 3,
  windowMs: number = 10 * 60 * 1000
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  cleanupExpiredEntries(now, windowMs);

  const record = rateLimitStore.get(key) ?? { timestamps: [] };
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowMs - (now - oldestTimestamp)) / 1000)
    );
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  record.timestamps.push(now);
  rateLimitStore.set(key, record);

  return {
    allowed: true,
    remaining: maxRequests - record.timestamps.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Verifies that the honeypot field is empty.
 * If filled, the client is almost certainly an automated spam bot.
 */
export function isHoneypotTriggered(honeypotValue: unknown): boolean {
  if (typeof honeypotValue === "string") {
    return honeypotValue.trim().length > 0;
  }
  return Boolean(honeypotValue);
}

/**
 * Extracts a dependable client IP address from standard reverse-proxy headers.
 */
export function getClientIp(req: Request): string {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map((ip) => ip.trim());
    if (ips[0]) return ips[0];
  }
  const xRealIp = req.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();
  return "127.0.0.1";
}

/**
 * Generates an immutable, human-friendly server-side reference code.
 * Format: PREFIX-XXXXX (e.g. BL-TTR-8K49A)
 */
export function generateReferenceCode(prefix: "BL-SCH" | "BL-TTR" | "BL-CNT"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous 0/O, 1/I
  let code = "";
  for (let i = 0; i < 5; i++) {
    const randIndex = Math.floor(Math.random() * chars.length);
    code += chars.charAt(randIndex);
  }
  return `${prefix}-${code}`;
}
