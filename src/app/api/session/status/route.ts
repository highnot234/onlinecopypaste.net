// GET /api/session/status?sessionId=<id>
// Returns current session status. Requires a valid Authorization: Bearer <token> header.
// Works in both Cloudflare Workers (DO-backed) and local Node dev (in-memory).

import { NextRequest, NextResponse } from 'next/server';
import { adapterGet, adapterVerifyToken } from '@/lib/session/adapter';

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

  const decoded = await adapterVerifyToken(token);
  if (!decoded) {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }
  if (decoded.sessionId !== sessionId) {
    return NextResponse.json({ error: 'Token does not match the requested session.' }, { status: 403 });
  }

  const session = await adapterGet(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  return NextResponse.json({
    status: session.status,
    deviceCount: session.deviceCount,
    peerCount: session.deviceCount,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  });
}
