// GET /api/session/status?sessionId=<id>
// Returns current session status. Requires a valid Authorization: Bearer <token> header.
// Does NOT expose IP addresses or raw peer WebSocket objects.

import { NextRequest, NextResponse } from 'next/server';
import { verify as jwtVerify } from 'jsonwebtoken';
import sessionStore from '@/lib/session/SessionStore';

function getSessionSecret(): string {
  return process.env.SESSION_SECRET ?? 'dev-secret-change-in-production-32c';
}

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = getToken(req);
  if (!token) {
    return NextResponse.json(
      { error: 'Authorization header with Bearer token is required.' },
      { status: 401 },
    );
  }

  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId query parameter is required.' }, { status: 400 });
  }

  // Verify JWT
  let decoded: { sessionId: string; role: string };
  try {
    decoded = jwtVerify(token, getSessionSecret()) as { sessionId: string; role: string };
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }

  // Token must match the requested session
  if (decoded.sessionId !== sessionId) {
    return NextResponse.json(
      { error: 'Token does not match the requested session.' },
      { status: 403 },
    );
  }

  // Look up session
  const session = sessionStore.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  // Count peers safely (do not expose WebSocket objects or IP addresses)
  const peerCount = Object.keys(session.peers).length;

  return NextResponse.json({
    status: session.status,
    deviceCount: session.deviceCount,
    peerCount,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  });
}
