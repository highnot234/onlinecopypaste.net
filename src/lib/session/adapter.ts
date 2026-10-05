/**
 * src/lib/session/adapter.ts
 *
 * Unified session adapter that works in both environments:
 *   - Cloudflare Workers runtime → delegates to SignalingRoom DO via HTTP
 *   - Node.js local dev server   → uses in-memory SessionStore directly
 *
 * API routes import from this file instead of importing SessionStore or
 * the DO client directly.
 */

// Detect Cloudflare Workers runtime
// In workerd, globalThis.caches is the CF Cache API (not the browser Cache).
// In Node, it's undefined (or the browser polyfill from next, but not CF).
const isCloudflare = typeof (globalThis as Record<string, unknown>).WebSocketPair !== 'undefined';

// Lazy imports to avoid bundling Node-only code into the CF worker bundle
// and to avoid importing CF-only code into the Node process.

export interface SessionData {
  id: string;
  pairCode: string;
  pairCodeFormatted: string;
  tokenHash?: string;
  phoneTokenHash?: string;
  createdAt: string;
  expiresAt: string;
  status: 'waiting' | 'paired' | 'active' | 'destroyed';
  deviceCount: number;
  ipAddress?: string;
  token?: string;
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
export async function adapterCreate(params: {
  ipAddress: string;
  durationMinutes: number;
}): Promise<SessionData & { token: string }> {
  if (isCloudflare) {
    const { doCreateSession } = await import('@/lib/do/client');
    const rec = await doCreateSession(params);
    return {
      ...rec,
      pairCodeFormatted: formatPairCode(rec.pairCode),
      token: rec.token!,
    };
  } else {
    // Node path — local dev
    const { default: sessionStore } = await import('@/lib/session/SessionStore');
    const { formatPairCode: fp, hashToken } = await import('@/lib/session/utils');
    const { sign: jwtSign } = await import('jsonwebtoken');
    const secret = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production-32c';
    const session = sessionStore.create(params.ipAddress, params.durationMinutes);
    const token = jwtSign({ sessionId: session.id, role: 'pc' }, secret, {
      expiresIn: `${params.durationMinutes}m`,
    });
    sessionStore.update(session.id, { tokenHash: hashToken(token) });
    return {
      id: session.id,
      pairCode: session.pairCode,
      pairCodeFormatted: fp(session.pairCode),
      tokenHash: hashToken(token),
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      status: session.status,
      deviceCount: session.deviceCount,
      token,
    };
  }
}

// ---------------------------------------------------------------------------
// join
// ---------------------------------------------------------------------------
export async function adapterJoin(params: {
  pairCode: string;
  ipAddress: string;
}): Promise<(SessionData & { token: string }) | null> {
  if (isCloudflare) {
    const { doJoinSession } = await import('@/lib/do/client');
    try {
      const rec = await doJoinSession(params);
      return { ...rec, pairCodeFormatted: formatPairCode(rec.pairCode), token: rec.token! };
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e.status === 404 || e.status === 410) return null;
      throw err;
    }
  } else {
    const { default: sessionStore } = await import('@/lib/session/SessionStore');
    const { formatPairCode: fp, hashToken } = await import('@/lib/session/utils');
    const { sign: jwtSign } = await import('jsonwebtoken');
    const secret = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production-32c';

    const raw = params.pairCode.replace(/\s/g, '');
    const session = sessionStore.getByPairCode(raw);
    if (!session) return null;
    if (session.status === 'destroyed') return null;
    const nowMs = Date.now();
    const remainingMs = session.expiresAt.getTime() - nowMs;
    if (remainingMs <= 0) return null;
    const remainingMinutes = Math.ceil(remainingMs / 60_000);
    const token = jwtSign({ sessionId: session.id, role: 'phone' }, secret, {
      expiresIn: `${remainingMinutes}m`,
    });
    sessionStore.update(session.id, { phoneTokenHash: hashToken(token) });
    return {
      id: session.id,
      pairCode: session.pairCode,
      pairCodeFormatted: fp(session.pairCode),
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      status: session.status,
      deviceCount: session.deviceCount,
      token,
    };
  }
}

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------
export async function adapterGet(sessionId: string): Promise<SessionData | null> {
  if (isCloudflare) {
    const { doGetSession } = await import('@/lib/do/client');
    const rec = await doGetSession(sessionId);
    if (!rec) return null;
    return { ...rec, pairCodeFormatted: formatPairCode(rec.pairCode) };
  } else {
    const { default: sessionStore } = await import('@/lib/session/SessionStore');
    const { formatPairCode: fp } = await import('@/lib/session/utils');
    const s = sessionStore.get(sessionId);
    if (!s) return null;
    return {
      id: s.id,
      pairCode: s.pairCode,
      pairCodeFormatted: fp(s.pairCode),
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      status: s.status,
      deviceCount: s.deviceCount,
    };
  }
}

// ---------------------------------------------------------------------------
// destroy
// ---------------------------------------------------------------------------
export async function adapterDestroy(sessionId: string): Promise<void> {
  if (isCloudflare) {
    const { doDestroySession } = await import('@/lib/do/client');
    await doDestroySession(sessionId);
  } else {
    const { default: sessionStore } = await import('@/lib/session/SessionStore');
    sessionStore.destroy(sessionId);
  }
}

// ---------------------------------------------------------------------------
// size
// ---------------------------------------------------------------------------
export async function adapterSize(): Promise<number> {
  if (isCloudflare) {
    const { doSessionSize } = await import('@/lib/do/client');
    return doSessionSize();
  } else {
    const { default: sessionStore } = await import('@/lib/session/SessionStore');
    return sessionStore.size();
  }
}

// ---------------------------------------------------------------------------
// verifyToken — shared between Node and CF (both use jsonwebtoken / jose)
// ---------------------------------------------------------------------------
export async function adapterVerifyToken(
  token: string,
): Promise<{ sessionId: string; role: string } | null> {
  const secret = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production-32c';
  if (isCloudflare) {
    const { jwtVerify } = await import('jose');
    try {
      const key = new TextEncoder().encode(secret);
      const { payload } = await jwtVerify(token, key);
      return { sessionId: payload.sessionId as string, role: payload.role as string };
    } catch {
      return null;
    }
  } else {
    const { verify } = await import('jsonwebtoken');
    try {
      const decoded = verify(token, secret) as { sessionId: string; role: string };
      return decoded;
    } catch {
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Inline formatPairCode (avoid circular import from utils)
// ---------------------------------------------------------------------------
function formatPairCode(raw: string): string {
  const digits = raw.replace(/\D/g, '').padStart(6, '0').slice(0, 6);
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}
