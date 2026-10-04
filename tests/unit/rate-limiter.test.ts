import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RateLimiter } from '@/lib/rate-limiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit', () => {
    const limiter = new RateLimiter(60_000, 5);
    for (let i = 0; i < 5; i++) {
      expect(limiter.check('user1')).toBe(true);
    }
  });

  it('blocks requests that exceed the limit', () => {
    const limiter = new RateLimiter(60_000, 3);
    limiter.check('user1');
    limiter.check('user1');
    limiter.check('user1');
    // 4th request should be denied
    expect(limiter.check('user1')).toBe(false);
  });

  it('tracks different keys independently', () => {
    const limiter = new RateLimiter(60_000, 2);
    limiter.check('user1');
    limiter.check('user1');

    // user1 is at limit, but user2 should be fine
    expect(limiter.check('user1')).toBe(false);
    expect(limiter.check('user2')).toBe(true);
  });

  it('allows requests again after the window expires', () => {
    const limiter = new RateLimiter(1_000, 2);
    limiter.check('user1');
    limiter.check('user1');
    // Blocked
    expect(limiter.check('user1')).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(1_001);

    // Should be allowed again
    expect(limiter.check('user1')).toBe(true);
  });

  it('reset() clears the counter for a key', () => {
    const limiter = new RateLimiter(60_000, 2);
    limiter.check('user1');
    limiter.check('user1');
    expect(limiter.check('user1')).toBe(false);

    limiter.reset('user1');
    expect(limiter.check('user1')).toBe(true);
  });

  it('uses a sliding window (not fixed window)', () => {
    const limiter = new RateLimiter(1_000, 3);

    // t=0: send 3 requests
    limiter.check('user1');
    limiter.check('user1');
    limiter.check('user1');
    // blocked
    expect(limiter.check('user1')).toBe(false);

    // t=500ms: advance half a window — still blocked because the original 3 are in window
    vi.advanceTimersByTime(500);
    expect(limiter.check('user1')).toBe(false);

    // t=1001ms: original 3 requests have now expired
    vi.advanceTimersByTime(501);
    expect(limiter.check('user1')).toBe(true);
  });

  it('cleanup() removes expired entries', () => {
    const limiter = new RateLimiter(1_000, 10);
    limiter.check('user1');
    limiter.check('user2');

    vi.advanceTimersByTime(2_000);
    limiter.cleanup();

    // After cleanup, requests should be allowed again from a fresh window
    expect(limiter.check('user1')).toBe(true);
    expect(limiter.check('user2')).toBe(true);
  });
});
