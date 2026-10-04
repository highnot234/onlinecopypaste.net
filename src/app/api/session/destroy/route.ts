// POST /api/session/destroy
// Destroys a session after verifying the JWT.
// The caller must provide a valid Authorization: Bearer <token> header.

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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = getToken(req);
  if (!token) {
    return NextResponse.json(
      { error: 'Authorization header with Bearer token is required.' },
      { status: 401 },
    );
  }

  // Parse body
  let body: { sessionId?: string } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { sessionId } = body;
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });
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

  // Destroy
  sessionStore.destroy(sessionId);

  return NextResponse.json({ destroyed: true });
}
