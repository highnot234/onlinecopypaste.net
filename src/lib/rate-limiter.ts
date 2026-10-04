// Sliding-window rate limiter.
// No browser-only or Node-only APIs — safe for both environments.

/**
 * Sliding-window rate limiter backed by a Map.
 *
 * Each key maps to an array of timestamps representing requests that
 * occurred within the current window. Timestamps outside the window
 * are pruned on every check.
 */
export class RateLimiter {
  private windows: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check whether the given key is under the rate limit.
   * Records the current request if it is allowed.
   * Returns true if the request is allowed, false if rate-limited.
   */
  check(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let timestamps = this.windows.get(key);
    if (!timestamps) {
      timestamps = [];
      this.windows.set(key, timestamps);
    }

    // Remove timestamps that have fallen outside the window
    const inWindow = timestamps.filter((t) => t > windowStart);

    if (inWindow.length >= this.maxRequests) {
      // Update the pruned list without adding the new request
      this.windows.set(key, inWindow);
      return false;
    }

    // Allowed — record this request
    inWindow.push(now);
    this.windows.set(key, inWindow);
    return true;
  }

  /**
   * Reset the rate-limit counter for a given key.
   */
  reset(key: string): void {
    this.windows.delete(key);
  }

  /**
   * Remove all keys whose windows are completely expired.
   * Call periodically to prevent unbounded memory growth.
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    for (const [key, timestamps] of this.windows) {
      const inWindow = timestamps.filter((t) => t > windowStart);
      if (inWindow.length === 0) {
        this.windows.delete(key);
      } else {
        this.windows.set(key, inWindow);
      }
    }
  }
}

/**
 * Default limiter for session creation:
 * 20 new sessions per IP per minute.
 */
const rateLimiter = new RateLimiter(60_000, 20);
export default rateLimiter;

/**
 * Limiter for WebSocket messages:
 * 50 messages per connection per second.
 */
export const wsRateLimiter = new RateLimiter(1_000, 50);
