// POST /api/session/create
// Creates a new temporary session. Returns sessionId, pairCode, QR code, and JWT.
// Works in both Cloudflare Workers (DO-backed) and local Node dev (in-memory).

import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { adapterCreate } from '@/lib/session/adapter';
import rateLimiter from '@/lib/rate-limiter';

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

  if (!rateLimiter.check(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before creating another session.' },
      { status: 429 },
    );
  }

  let body: { durationMinutes?: number; role?: string } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const durationMinutes = body.durationMinutes ?? 30;
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

  // Validate role if provided
  const role = (body as { role?: string }).role;
  if (role !== undefined && role !== 'pc' && role !== 'phone') {
    return NextResponse.json({ error: 'role must be "pc" or "phone".' }, { status: 400 });
  }

  // Create session via adapter (DO on CF, in-memory on Node)
  const session = await adapterCreate({ ipAddress: ip, durationMinutes });

  // Generate QR code
  const joinUrl = `${getAppUrl()}/join/${session.pairCode}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(joinUrl, { errorCorrectionLevel: 'M', margin: 2 });
  } catch {
    qrDataUrl = '';
  }

  return NextResponse.json({
    sessionId: session.id,
    pairCode: session.pairCode,
    pairCodeFormatted: session.pairCodeFormatted,
    qrDataUrl,
    token: session.token,
    expiresAt: session.expiresAt,
    joinUrl,
  });
}
