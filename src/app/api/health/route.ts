// GET /api/health
// Public health check endpoint — no authentication required.
// Returns server status, timestamp, active session count, and version.

import { NextRequest, NextResponse } from 'next/server';
import sessionStore from '@/lib/session/SessionStore';

export async function GET(_req: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeSessions: sessionStore.size(),
    version: '1.0.0',
  });
}
