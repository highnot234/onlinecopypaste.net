// Integration tests for the Next.js API routes.
// SessionStore is mocked with vi.mock() to avoid singleton state issues between tests.
// These tests call the route handlers directly (not via a running HTTP server).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { sign as jwtSign } from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
const SESSION_SECRET = 'test-secret-for-integration-tests';
process.env.SESSION_SECRET = SESSION_SECRET;
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.MAX_SESSION_MINUTES = '60';

// ---------------------------------------------------------------------------
// Stable session fixture
// ---------------------------------------------------------------------------
const mockSession = {
  id: 'test-session-id-1234',
  pairCode: '482913',
  tokenHash: '',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  status: 'waiting' as const,
  peers: {} as Record<string, unknown>,
  deviceCount: 0,
  ipAddress: '127.0.0.1',
};

// Mutable in-memory store shared across all mocks
const mockStore: Map<string, typeof mockSession> = new Map();

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports that consume the mocked modules
// ---------------------------------------------------------------------------

vi.mock('@/lib/session/SessionStore', () => ({
  default: {
    create: vi.fn((_ip: string, _duration?: number) => {
      const session = { ...mockSession };
      mockStore.set(session.id, session);
      return session;
    }),
    get: vi.fn((id: string) => mockStore.get(id)),
    getByPairCode: vi.fn((code: string) => {
      for (const s of mockStore.values()) {
        if (s.pairCode === code) return s;
      }
      return undefined;
    }),
    update: vi.fn((id: string, partial: Partial<typeof mockSession>) => {
      const session = mockStore.get(id);
      if (session) Object.assign(session, partial);
    }),
    destroy: vi.fn((id: string) => {
      mockStore.delete(id);
    }),
    cleanup: vi.fn(),
    size: vi.fn(() => mockStore.size),
  },
  hashToken: vi.fn((token: string) => `hash:${token}`),
}));

vi.mock('@/lib/rate-limiter', () => ({
  default: { check: vi.fn(() => true), reset: vi.fn() },
  rateLimiter: { check: vi.fn(() => true), reset: vi.fn() },
  wsRateLimiter: { check: vi.fn(() => true), reset: vi.fn() },
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(async () => 'data:image/png;base64,mockQRCode'),
  },
}));

// ---------------------------------------------------------------------------
// Import route handlers after mocks are set up
// ---------------------------------------------------------------------------
import { POST as createSession } from '@/app/api/session/create/route';
import { POST as destroySession } from '@/app/api/session/destroy/route';
import { GET as getStatus } from '@/app/api/session/status/route';
import { GET as getHealth } from '@/app/api/health/route';
import rateLimiter from '@/lib/rate-limiter';
import SessionStore from '@/lib/session/SessionStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): NextRequest {
  const { method = 'GET', body, headers = {} } = options;
  const allHeaders: Record<string, string> = { ...headers };
  if (body !== undefined) {
    allHeaders['content-type'] = 'application/json';
  }
  // Use type assertion to satisfy Next.js RequestInit which does not allow null signal
  const init = {
    method,
    headers: allHeaders,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, init);
}

function makeToken(sessionId: string, role = 'pc'): string {
  return jwtSign({ sessionId, role }, SESSION_SECRET, { expiresIn: '30m' });
}

// ---------------------------------------------------------------------------
// POST /api/session/create
// ---------------------------------------------------------------------------
describe('POST /api/session/create', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.mocked(rateLimiter.check).mockReturnValue(true);
    vi.mocked(SessionStore.create).mockImplementation((_ip: string, _duration?: number) => {
      const session = { ...mockSession };
      mockStore.set(session.id, session);
      return session;
    });
    vi.mocked(SessionStore.size).mockImplementation(() => mockStore.size);
  });

  afterEach(() => {
    mockStore.clear();
  });

  it('returns 200 with sessionId, pairCode, qrDataUrl, token, and joinUrl', async () => {
    const req = makeRequest('http://localhost:3000/api/session/create', {
      method: 'POST',
      body: { durationMinutes: 30 },
    });

    const res = await createSession(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('sessionId');
    expect(data).toHaveProperty('pairCode');
    expect(data).toHaveProperty('pairCodeFormatted');
    expect(data).toHaveProperty('qrDataUrl');
    expect(data).toHaveProperty('token');
    expect(data).toHaveProperty('expiresAt');
    expect(data).toHaveProperty('joinUrl');
    expect(data.pairCode).toMatch(/^\d{6}$/);
    expect(data.pairCodeFormatted).toMatch(/^\d{3} \d{3}$/);
    expect(typeof data.token).toBe('string');
  });

  it('uses default durationMinutes of 30 when body is empty', async () => {
    const req = makeRequest('http://localhost:3000/api/session/create', {
      method: 'POST',
      body: {},
    });
    const res = await createSession(req);
    expect(res.status).toBe(200);
  });

  it('returns 400 for invalid durationMinutes (negative)', async () => {
    const req = makeRequest('http://localhost:3000/api/session/create', {
      method: 'POST',
      body: { durationMinutes: -5 },
    });
    const res = await createSession(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for durationMinutes exceeding max', async () => {
    const req = makeRequest('http://localhost:3000/api/session/create', {
      method: 'POST',
      body: { durationMinutes: 9999 },
    });
    const res = await createSession(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid role', async () => {
    const req = makeRequest('http://localhost:3000/api/session/create', {
      method: 'POST',
      body: { durationMinutes: 30, role: 'admin' },
    });
    const res = await createSession(req);
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(rateLimiter.check).mockReturnValueOnce(false);

    const req = makeRequest('http://localhost:3000/api/session/create', {
      method: 'POST',
      body: { durationMinutes: 30 },
    });
    const res = await createSession(req);
    expect(res.status).toBe(429);
  });
});

// ---------------------------------------------------------------------------
// POST /api/session/destroy
// ---------------------------------------------------------------------------
describe('POST /api/session/destroy', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.mocked(SessionStore.get).mockImplementation((id: string) => mockStore.get(id));
    vi.mocked(SessionStore.destroy).mockImplementation((id: string) => { mockStore.delete(id); });
  });

  afterEach(() => {
    mockStore.clear();
  });

  it('destroys session and returns { destroyed: true } with valid token', async () => {
    mockStore.set(mockSession.id, { ...mockSession });

    const token = makeToken(mockSession.id);
    const req = makeRequest('http://localhost:3000/api/session/destroy', {
      method: 'POST',
      body: { sessionId: mockSession.id },
      headers: { authorization: `Bearer ${token}` },
    });

    const res = await destroySession(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.destroyed).toBe(true);
  });

  it('returns 401 when no auth header', async () => {
    const req = makeRequest('http://localhost:3000/api/session/destroy', {
      method: 'POST',
      body: { sessionId: mockSession.id },
    });
    const res = await destroySession(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const req = makeRequest('http://localhost:3000/api/session/destroy', {
      method: 'POST',
      body: { sessionId: mockSession.id },
      headers: { authorization: 'Bearer invalid.token.here' },
    });
    const res = await destroySession(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 when token sessionId does not match body sessionId', async () => {
    const token = makeToken('different-session-id');
    const req = makeRequest('http://localhost:3000/api/session/destroy', {
      method: 'POST',
      body: { sessionId: mockSession.id },
      headers: { authorization: `Bearer ${token}` },
    });
    const res = await destroySession(req);
    expect(res.status).toBe(403);
  });

  it('returns 404 when session does not exist', async () => {
    // mockStore is empty — session not found
    const token = makeToken(mockSession.id);
    const req = makeRequest('http://localhost:3000/api/session/destroy', {
      method: 'POST',
      body: { sessionId: mockSession.id },
      headers: { authorization: `Bearer ${token}` },
    });
    const res = await destroySession(req);
    expect(res.status).toBe(404);
  });

  it('returns 400 when sessionId is missing from body', async () => {
    const token = makeToken(mockSession.id);
    const req = makeRequest('http://localhost:3000/api/session/destroy', {
      method: 'POST',
      body: {},
      headers: { authorization: `Bearer ${token}` },
    });
    const res = await destroySession(req);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/session/status
// ---------------------------------------------------------------------------
describe('GET /api/session/status', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.mocked(SessionStore.get).mockImplementation((id: string) => mockStore.get(id));
  });

  afterEach(() => {
    mockStore.clear();
  });

  it('returns session status with valid token', async () => {
    mockStore.set(mockSession.id, { ...mockSession });

    const token = makeToken(mockSession.id);
    const req = makeRequest(
      `http://localhost:3000/api/session/status?sessionId=${mockSession.id}`,
      { headers: { authorization: `Bearer ${token}` } },
    );

    const res = await getStatus(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('status', 'waiting');
    expect(data).toHaveProperty('deviceCount', 0);
    expect(data).toHaveProperty('peerCount');
    expect(data).toHaveProperty('createdAt');
    expect(data).toHaveProperty('expiresAt');
    // Verify no sensitive data is exposed
    expect(data).not.toHaveProperty('ipAddress');
  });

  it('returns 401 without auth header', async () => {
    const req = makeRequest(
      `http://localhost:3000/api/session/status?sessionId=${mockSession.id}`,
    );
    const res = await getStatus(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 without sessionId param', async () => {
    const token = makeToken(mockSession.id);
    const req = makeRequest('http://localhost:3000/api/session/status', {
      headers: { authorization: `Bearer ${token}` },
    });
    const res = await getStatus(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown session', async () => {
    // mockStore is empty
    const token = makeToken(mockSession.id);
    const req = makeRequest(
      `http://localhost:3000/api/session/status?sessionId=${mockSession.id}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    const res = await getStatus(req);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// GET /api/health
// ---------------------------------------------------------------------------
describe('GET /api/health', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.mocked(SessionStore.size).mockImplementation(() => mockStore.size);
  });

  it('returns status ok with expected fields', async () => {
    const req = makeRequest('http://localhost:3000/api/health');
    const res = await getHealth(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('activeSessions');
    expect(data).toHaveProperty('version', '1.0.0');
  });

  it('returns a valid ISO timestamp', async () => {
    const req = makeRequest('http://localhost:3000/api/health');
    const res = await getHealth(req);
    const data = await res.json();
    expect(() => new Date(data.timestamp)).not.toThrow();
    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
  });
});
