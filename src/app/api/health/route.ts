// GET /api/health
// Public health check endpoint — no authentication required.

import { NextRequest, NextResponse } from 'next/server';
import { adapterSize } from '@/lib/session/adapter';

export async function GET(_req: NextRequest): Promise<NextResponse> {
  let activeSessions = 0;
  try {
    activeSessions = await adapterSize();
  } catch {
    // Non-fatal — health check should still return 200
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeSessions,
    version: '1.0.0',
  });
}
