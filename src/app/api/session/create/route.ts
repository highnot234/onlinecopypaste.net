// POST /api/session/create
// Creates a new temporary session. Returns sessionId, pairCode, QR code, and JWT.
// No authentication required — this is the entry point.

import { NextRequest, NextResponse } from 'next/server';
import { sign as jwtSign } from 'jsonwebtoken';
import QRCode from 'qrcode';
import sessionStore from '@/lib/session/SessionStore';
import { formatPairCode, hashToken } from '@/lib/session/utils';
import rateLimiter from '@/lib/rate-limiter';

function getSessionSecret(): string {
  return process.env.SESSION_SECRET ?? 'dev-secret-change-in-production-32c';
}
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}
function getMaxSessionMinutes(): number {
  return parseInt(process.env.MAX_SESSION_MINUTES ?? '60', 10);
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? '127.0.0.1';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);

  // Rate limit by IP: 20 sessions per minute
  if (!rateLimiter.check(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before creating another session.' },
      { status: 429 },
    );
  }

  // Parse body
  let body: { durationMinutes?: number; role?: string } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const durationMinutes = body.durationMinutes ?? 30;

  // Validate duration
  const maxSessionMinutes = getMaxSessionMinutes();
  if (
    typeof durationMinutes !== 'number' ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes < 1 ||
    durationMinutes > maxSessionMinutes
  ) {
    return NextResponse.json(
      { error: `durationMinutes must be a number between 1 and ${maxSessionMinutes}.` },
      { status: 400 },
    );
  }

  // Validate role (optional — used in token payload)
  const role = (body.role as 'pc' | 'phone') ?? 'pc';
  if (role !== 'pc' && role !== 'phone') {
    return NextResponse.json({ error: 'role must be "pc" or "phone".' }, { status: 400 });
  }

  // Create session
  const session = sessionStore.create(ip, durationMinutes);

  // Sign JWT: { sessionId, role, iat }
  const token = jwtSign({ sessionId: session.id, role }, getSessionSecret(), {
    expiresIn: `${durationMinutes}m`,
  });

  // Store token hash in session
  sessionStore.update(session.id, { tokenHash: hashToken(token) });

  // Generate QR code for the join URL
  const joinUrl = `${getAppUrl()}/join/${session.pairCode}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(joinUrl, { errorCorrectionLevel: 'M', margin: 2 });
  } catch {
    // QR generation failure is non-fatal — return empty string
    qrDataUrl = '';
  }

  return NextResponse.json({
    sessionId: session.id,
    pairCode: session.pairCode,
    pairCodeFormatted: formatPairCode(session.pairCode),
    qrDataUrl,
    token,
    expiresAt: session.expiresAt.toISOString(),
    joinUrl,
  });
}
