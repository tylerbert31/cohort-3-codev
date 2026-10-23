/**
 * In-memory sliding window rate limiter for protecting sensitive endpoints
 * such as invite code lookup and join attempts against brute force attacks.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

class InMemoryRateLimiter {
  private records: Map<string, RateLimitRecord> = new Map();

  /**
   * Checks whether the specified key has exceeded the rate limit.
   * @param key Identifier for the actor (e.g. IP address, clerk_user_id, or session)
   * @param maxAttempts Maximum allowed attempts within the window
   * @param windowMs Time window in milliseconds (default 60 seconds)
   * @returns { allowed: boolean, remaining: number, resetAt: number }
   */
  check(key: string, maxAttempts = 10, windowMs = 60_000): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const existing = this.records.get(key);

    if (!existing || now > existing.resetAt) {
      const resetAt = now + windowMs;
      this.records.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: maxAttempts - 1, resetAt };
    }

    if (existing.count >= maxAttempts) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: maxAttempts - existing.count,
      resetAt: existing.resetAt,
    };
  }

  /**
   * Resets rate limit for a key (e.g. after successful authentication or test cleanup).
   */
  reset(key: string): void {
    this.records.delete(key);
  }

  /**
   * Cleans up expired entries to prevent memory leaks over time.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now > record.resetAt) {
        this.records.delete(key);
      }
    }
  }
}

export const inviteRateLimiter = new InMemoryRateLimiter();
