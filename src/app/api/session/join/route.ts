// POST /api/session/join
// Joins an existing session by its 6-digit pair code. Returns a phone-role JWT
// for the matched session. This is the correct endpoint for phone devices.

import { NextRequest, NextResponse } from 'next/server';
import { sign as jwtSign } from 'jsonwebtoken';
import sessionStore from '@/lib/session/SessionStore';
import { formatPairCode, hashToken } from '@/lib/session/utils';
import rateLimiter from '@/lib/rate-limiter';

function getSessionSecret(): string {
  return process.env.SESSION_SECRET ?? 'dev-secret-change-in-production-32c';
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? '127.0.0.1';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);

  // Rate limit by IP: 20 join attempts per minute
  if (!rateLimiter.check(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.' },
      { status: 429 },
    );
  }

  // Parse body
  let body: { pairCode?: string } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const rawCode = typeof body.pairCode === 'string' ? body.pairCode.replace(/\s/g, '') : '';

  if (!rawCode || !/^\d{6}$/.test(rawCode)) {
    return NextResponse.json(
      { error: 'pairCode must be a 6-digit number.' },
      { status: 400 },
    );
  }

  // Look up session by pair code
  const session = sessionStore.getByPairCode(rawCode);
  if (!session) {
    return NextResponse.json(
      { error: 'Session not found. The code may be incorrect or the session may have expired.' },
      { status: 404 },
    );
  }

  if (session.status === 'destroyed') {
    return NextResponse.json(
      { error: 'This session has been destroyed.' },
      { status: 410 },
    );
  }

  // Calculate remaining duration from session expiry
  const nowMs = Date.now();
  const remainingMs = session.expiresAt.getTime() - nowMs;
  if (remainingMs <= 0) {
    return NextResponse.json(
      { error: 'Session has expired.' },
      { status: 410 },
    );
  }
  const remainingMinutes = Math.ceil(remainingMs / 60_000);

  // Issue a phone-role JWT for the existing session
  const token = jwtSign(
    { sessionId: session.id, role: 'phone' },
    getSessionSecret(),
    { expiresIn: `${remainingMinutes}m` },
  );

  // Update phone token hash so the phone can authenticate over WebSocket.
  // Store separately so the PC's tokenHash remains valid.
  sessionStore.update(session.id, { phoneTokenHash: hashToken(token) });

  return NextResponse.json({
    sessionId: session.id,
    pairCode: session.pairCode,
    pairCodeFormatted: formatPairCode(session.pairCode),
    qrDataUrl: '',
    token,
    expiresAt: session.expiresAt.toISOString(),
    joinUrl: '',
  });
}
