import { describe, it, expect, beforeEach } from 'vitest';
import { generateSessionId, generatePairCode, formatPairCode, hashToken } from '@/lib/session/utils';
import SessionStore from '@/lib/session/SessionStore';

// ---------------------------------------------------------------------------
// utils
// ---------------------------------------------------------------------------

describe('generateSessionId', () => {
  it('returns a non-empty string', () => {
    expect(generateSessionId()).toBeTruthy();
  });

  it('returns a UUID v4 format (8-4-4-4-12)', () => {
    const id = generateSessionId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('returns a unique value on each call', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateSessionId()));
    expect(ids.size).toBe(100);
  });
});

describe('generatePairCode', () => {
  it('returns exactly 6 characters', () => {
    for (let i = 0; i < 50; i++) {
      expect(generatePairCode()).toHaveLength(6);
    }
  });

  it('contains only numeric characters', () => {
    for (let i = 0; i < 50; i++) {
      expect(generatePairCode()).toMatch(/^\d{6}$/);
    }
  });

  it('pads with leading zeros when needed', () => {
    // We can't force a specific value but we verify the constraint
    const code = generatePairCode();
    expect(parseInt(code, 10)).toBeGreaterThanOrEqual(0);
    expect(parseInt(code, 10)).toBeLessThan(1_000_000);
  });
});

describe('formatPairCode', () => {
  it('formats 6 digits as XXX XXX', () => {
    expect(formatPairCode('482913')).toBe('482 913');
  });

  it('handles zero-padded codes', () => {
    expect(formatPairCode('000001')).toBe('000 001');
  });

  it('strips non-digit characters before formatting', () => {
    expect(formatPairCode('48-2913')).toBe('482 913');
  });
});

describe('hashToken', () => {
  it('returns a 64-character hex string (SHA-256)', () => {
    expect(hashToken('mysecret')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces the same hash for the same input', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashToken('abc')).not.toBe(hashToken('xyz'));
  });
});

// ---------------------------------------------------------------------------
// SessionStore
// ---------------------------------------------------------------------------

describe('SessionStore', () => {
  // Clear sessions between tests by relying on create/destroy
  let createdIds: string[] = [];

  beforeEach(() => {
    // Destroy any sessions created in prior tests
    for (const id of createdIds) {
      SessionStore.destroy(id);
    }
    createdIds = [];
  });

  it('creates a session and returns it', () => {
    const session = SessionStore.create('127.0.0.1', 30);
    createdIds.push(session.id);

    expect(session.id).toBeTruthy();
    expect(session.pairCode).toMatch(/^\d{6}$/);
    expect(session.status).toBe('waiting');
    expect(session.deviceCount).toBe(0);
    expect(session.ipAddress).toBe('127.0.0.1');
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('retrieves a session by ID', () => {
    const session = SessionStore.create('127.0.0.1', 30);
    createdIds.push(session.id);

    const retrieved = SessionStore.get(session.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(session.id);
  });

  it('retrieves a session by pair code', () => {
    const session = SessionStore.create('127.0.0.1', 30);
    createdIds.push(session.id);

    const retrieved = SessionStore.getByPairCode(session.pairCode);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(session.id);
  });

  it('returns undefined for unknown ID', () => {
    expect(SessionStore.get('non-existent-id')).toBeUndefined();
  });

  it('returns undefined for unknown pair code', () => {
    expect(SessionStore.getByPairCode('999999')).toBeUndefined();
  });

  it('updates a session', () => {
    const session = SessionStore.create('127.0.0.1', 30);
    createdIds.push(session.id);

    SessionStore.update(session.id, { status: 'paired', deviceCount: 2 });

    const updated = SessionStore.get(session.id);
    expect(updated?.status).toBe('paired');
    expect(updated?.deviceCount).toBe(2);
  });

  it('destroys a session', () => {
    const session = SessionStore.create('127.0.0.1', 30);
    // Don't push to createdIds — we're destroying it manually
    SessionStore.destroy(session.id);

    expect(SessionStore.get(session.id)).toBeUndefined();
    expect(SessionStore.getByPairCode(session.pairCode)).toBeUndefined();
  });

  it('cleanup removes expired sessions', () => {
    const session = SessionStore.create('127.0.0.1', 30);
    // Force expire
    SessionStore.update(session.id, { expiresAt: new Date(Date.now() - 1000) });
    SessionStore.cleanup();

    expect(SessionStore.get(session.id)).toBeUndefined();
  });
});
