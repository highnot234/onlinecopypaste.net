/**
 * src/worker.ts — Cloudflare Worker entry point
 *
 * Routing:
 *   /ws  (WebSocket Upgrade) → SignalingRoom Durable Object
 *   /ws  (non-upgrade)       → 426 Upgrade Required
 *   *    (everything else)   → OpenNext Next.js handler
 *
 * The SignalingRoom DO also handles all session HTTP API calls from
 * Next.js API routes via the SIGNALING_ROOM binding.
 */

import type { NextRequest } from 'next/server';

// Re-export the Durable Object class so Wrangler can find it.
export { SignalingRoom } from './do/SignalingRoom';

// OpenNext generates a default export named `handler` (or `fetch`) that
// handles Next.js requests. We import it here and compose our routing on top.
// The actual import path resolves after `opennextjs-cloudflare build` produces
// `.open-next/worker.js` — during local dev this file is bundled by wrangler.
// @ts-ignore — generated at build time
import nextHandler from '__NEXT_HANDLER__';

export interface Env {
  SIGNALING_ROOM: DurableObjectNamespace;
  SESSION_SECRET: string;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_WS_URL?: string;
  MAX_SESSION_MINUTES?: string;
  MAX_FILE_SIZE_MB?: string;
  ASSETS: Fetcher;
  WORKER_SELF_REFERENCE?: Fetcher;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // -------------------------------------------------------------------------
    // Route WebSocket upgrade requests to the SignalingRoom Durable Object
    // -------------------------------------------------------------------------
    if (url.pathname === '/ws') {
      const isUpgrade = request.headers.get('Upgrade')?.toLowerCase() === 'websocket';
      if (!isUpgrade) {
        return new Response('WebSocket upgrade required', { status: 426 });
      }

      // All sessions share a single DO instance named "global".
      // This means one DO owns all sessions and WebSocket connections.
      // For production at scale, shard by session ID — but one instance
      // handles thousands of concurrent WebSocket connections fine.
      const doId = env.SIGNALING_ROOM.idFromName('global');
      const stub = env.SIGNALING_ROOM.get(doId);
      return stub.fetch(request);
    }

    // -------------------------------------------------------------------------
    // Route internal DO API calls (from Next.js API routes)
    // /do/* paths are proxied to the SignalingRoom DO
    // -------------------------------------------------------------------------
    if (url.pathname.startsWith('/do/')) {
      const doId = env.SIGNALING_ROOM.idFromName('global');
      const stub = env.SIGNALING_ROOM.get(doId);
      return stub.fetch(request);
    }

    // -------------------------------------------------------------------------
    // All other requests → Next.js via OpenNext handler
    // -------------------------------------------------------------------------
    return nextHandler.fetch(request as unknown as NextRequest, env, ctx);
  },
} satisfies ExportedHandler<Env>;
