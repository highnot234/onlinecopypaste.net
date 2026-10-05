// POST /api/session/join
// Joins an existing session by its 6-digit pair code.
// Works in both Cloudflare Workers (DO-backed) and local Node dev (in-memory).

import { NextRequest, NextResponse } from 'next/server';
import { adapterJoin } from '@/lib/session/adapter';
import { formatPairCode } from '@/lib/session/utils';
import rateLimiter from '@/lib/rate-limiter';

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? '127.0.0.1';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);

  if (!rateLimiter.check(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.' },
      { status: 429 },
    );
  }

  let body: { pairCode?: string } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const rawCode = typeof body.pairCode === 'string' ? body.pairCode.replace(/\s/g, '') : '';
  if (!rawCode || !/^\d{6}$/.test(rawCode)) {
    return NextResponse.json({ error: 'pairCode must be a 6-digit number.' }, { status: 400 });
  }

  const session = await adapterJoin({ pairCode: rawCode, ipAddress: ip });
  if (!session) {
    return NextResponse.json(
      { error: 'Session not found. The code may be incorrect or the session may have expired.' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    sessionId: session.id,
    pairCode: session.pairCode,
    pairCodeFormatted: formatPairCode(session.pairCode),
    qrDataUrl: '',
    token: session.token,
    expiresAt: session.expiresAt,
    joinUrl: '',
  });
}
