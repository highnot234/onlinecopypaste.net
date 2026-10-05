/**
 * src/lib/do/client.ts
 *
 * Thin client for calling the SignalingRoom Durable Object's internal HTTP API
 * from Next.js API routes.
 *
 * In Cloudflare Workers, Next.js API routes run inside the same Worker process.
 * The DO stub is available via the SIGNALING_ROOM binding in the Env.
 * We call the DO at the well-known /do/* paths defined in SignalingRoom.fetch().
 *
 * In local Node development (npm run dev), the API routes use the in-memory
 * SessionStore directly (imported from @/lib/session/SessionStore).
 * This module is ONLY used by the Cloudflare-compiled API routes.
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';

// Serialised session record returned by the DO (no secrets, no WebSocket refs)
export interface DOSessionRecord {
  id: string;
  pairCode: string;
  pairCodeFormatted?: string;
  createdAt: string;
  expiresAt: string;
  status: 'waiting' | 'paired' | 'active' | 'destroyed';
  deviceCount: number;
  token?: string;       // only present in create/join responses
  tokenHash?: string;   // only present in create response
  phoneTokenHash?: string;
}

async function doFetch(path: string, init?: RequestInit): Promise<Response> {
  const ctx = await getCloudflareContext<{ SIGNALING_ROOM: { idFromName(name: string): unknown; get(id: unknown): { fetch(r: Request): Promise<Response> } } }>();
  const ns = ctx.env.SIGNALING_ROOM;
  const doId = ns.idFromName('global');
  const stub = ns.get(doId);
  // The URL host is irrelevant — the DO only inspects the pathname.
  return stub.fetch(`https://do.internal${path}`, init);
}

export async function doCreateSession(params: {
  ipAddress: string;
  durationMinutes: number;
}): Promise<DOSessionRecord> {
  const res = await doFetch('/do/session/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json() as Promise<DOSessionRecord>;
}

export async function doJoinSession(params: {
  pairCode: string;
  ipAddress: string;
}): Promise<DOSessionRecord & { error?: string }> {
  const res = await doFetch('/do/session/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as DOSessionRecord & { error?: string };
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'DO error'), { status: res.status });
  return data;
}

export async function doGetSession(sessionId: string): Promise<DOSessionRecord | null> {
  const res = await doFetch(`/do/session/get?sessionId=${encodeURIComponent(sessionId)}`);
  if (res.status === 404) return null;
  return res.json() as Promise<DOSessionRecord>;
}

export async function doGetByPairCode(pairCode: string): Promise<DOSessionRecord | null> {
  const res = await doFetch(`/do/session/getByPairCode?pairCode=${encodeURIComponent(pairCode)}`);
  if (res.status === 404) return null;
  return res.json() as Promise<DOSessionRecord>;
}

export async function doUpdateSession(
  sessionId: string,
  patch: Partial<DOSessionRecord>,
): Promise<void> {
  await doFetch('/do/session/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, ...patch }),
  });
}

export async function doDestroySession(sessionId: string): Promise<void> {
  await doFetch('/do/session/destroy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
}

export async function doSessionSize(): Promise<number> {
  const res = await doFetch('/do/session/size');
  const data = (await res.json()) as { size: number };
  return data.size;
}
