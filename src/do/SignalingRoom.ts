/**
 * SignalingRoom — Cloudflare Durable Object
 *
 * Replaces both the Node WebSocket server (server.ts) and the in-memory
 * SessionStore singleton. Because a single DO instance owns all sessions,
 * state is consistent across every Worker instance.
 *
 * Responsibilities:
 *  1. Internal HTTP API  — called by Next.js API routes via the DO stub binding
 *     POST /do/session/create
 *     POST /do/session/join
 *     GET  /do/session/get?sessionId=
 *     GET  /do/session/getByPairCode?pairCode=
 *     POST /do/session/update
 *     POST /do/session/destroy
 *     GET  /do/session/size
 *
 *  2. WebSocket signaling — the Worker routes /ws upgrade requests here
 *     Messages: join | offer | answer | ice-candidate | destroy | ping
 *
 * WebSocket Hibernation API is used (webSocketMessage / webSocketClose /
 * webSocketError) so idle connections don't consume CPU.
 */

import { createHash } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

// ---------------------------------------------------------------------------
// Types (inline — DO cannot import from src/types due to bundling constraints)
// ---------------------------------------------------------------------------

type SessionStatus = 'waiting' | 'paired' | 'active' | 'destroyed';
type PeerRole = 'pc' | 'phone';

interface SessionRecord {
  id: string;
  pairCode: string;
  tokenHash: string;
  phoneTokenHash?: string;
  createdAt: string;   // ISO string (Date not serialisable in structured clone)
  expiresAt: string;   // ISO string
  status: SessionStatus;
  ipAddress: string;
  deviceCount: number;
}

// WebSocket attachment (stored with ws.serializeAttachment / deserializeAttachment)
interface WsAttachment {
  sessionId: string;
  role: PeerRole;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateSessionId(): string {
  return crypto.randomUUID();
}

function generatePairCode(): string {
  const num = Math.floor(Math.random() * 1_000_000);
  return String(num).padStart(6, '0');
}

function formatPairCode(raw: string): string {
  const digits = raw.replace(/\D/g, '').padStart(6, '0').slice(0, 6);
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

function getSessionSecret(env: Env): string {
  return env.SESSION_SECRET ?? 'dev-secret-change-in-production-32c';
}

function secretKey(env: Env): Uint8Array {
  return new TextEncoder().encode(getSessionSecret(env));
}

async function signJwt(
  payload: Record<string, unknown>,
  env: Env,
  expiresInMinutes: number,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresInMinutes}m`)
    .sign(secretKey(env));
}

async function verifyJwt(
  token: string,
  env: Env,
): Promise<Record<string, unknown>> {
  const { payload } = await jwtVerify(token, secretKey(env));
  return payload as Record<string, unknown>;
}

function jsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonErr(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sendWs(ws: WebSocket, payload: unknown): void {
  try {
    ws.send(JSON.stringify(payload));
  } catch {
    // ignore — connection may be closing
  }
}

// ---------------------------------------------------------------------------
// Rate limiter (per-DO sliding window — in-memory, reset on DO eviction)
// ---------------------------------------------------------------------------

class RateLimiter {
  private windows = new Map<string, number[]>();
  constructor(
    private windowMs: number,
    private max: number,
  ) {}

  check(key: string): boolean {
    const now = Date.now();
    const start = now - this.windowMs;
    const ts = (this.windows.get(key) ?? []).filter(t => t > start);
    if (ts.length >= this.max) {
      this.windows.set(key, ts);
      return false;
    }
    ts.push(now);
    this.windows.set(key, ts);
    return true;
  }

  cleanup(): void {
    const start = Date.now() - this.windowMs;
    for (const [k, ts] of this.windows) {
      const kept = ts.filter(t => t > start);
      if (kept.length === 0) this.windows.delete(k);
      else this.windows.set(k, kept);
    }
  }
}

// ---------------------------------------------------------------------------
// Env interface (populated by wrangler.jsonc bindings)
// ---------------------------------------------------------------------------

interface Env {
  SESSION_SECRET: string;
  NEXT_PUBLIC_APP_URL?: string;
  MAX_SESSION_MINUTES?: string;
}

// ---------------------------------------------------------------------------
// SignalingRoom Durable Object
// ---------------------------------------------------------------------------

// DurableObject base class is injected by the Workers runtime at deploy time.
// We declare a minimal interface here so TypeScript doesn't complain, and the
// real runtime base class is provided by workerd.
declare class DurableObjectBase {
  readonly state: DurableObjectState;
  readonly env: Env;
  constructor(state: DurableObjectState, env: Env);
}
const DurableObjectBaseClass: typeof DurableObjectBase =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).DurableObject ?? class {
    constructor(public state: DurableObjectState, public env: Env) {}
  };

export class SignalingRoom extends DurableObjectBaseClass {
  private sessions = new Map<string, SessionRecord>();
  private pairCodes = new Map<string, string>(); // pairCode → sessionId
  // Live WebSocket peers: sessionId → { pc?: WebSocket; phone?: WebSocket }
  private peers = new Map<string, Partial<Record<PeerRole, WebSocket>>>();

  private connRateLimiter = new RateLimiter(60_000, 30);
  private msgRateLimiter  = new RateLimiter(1_000, 60);

  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  // Explicitly store state reference regardless of base class property name
  private _state: DurableObjectState;
  private _env: Env;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this._state = state;
    this._env = env;
    // Periodic cleanup of expired sessions
    this.cleanupTimer = setInterval(() => this.cleanExpired(), 60_000);
  }

  // -------------------------------------------------------------------------
  // fetch — entry point for both HTTP (API) and WebSocket (signaling)
  // -------------------------------------------------------------------------

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      return this.handleWebSocketUpgrade(request, url);
    }

    // Internal HTTP API
    const path = url.pathname;

    if (path === '/do/session/create' && request.method === 'POST') {
      return this.apiCreate(request);
    }
    if (path === '/do/session/join' && request.method === 'POST') {
      return this.apiJoin(request);
    }
    if (path === '/do/session/get' && request.method === 'GET') {
      return this.apiGet(url);
    }
    if (path === '/do/session/getByPairCode' && request.method === 'GET') {
      return this.apiGetByPairCode(url);
    }
    if (path === '/do/session/update' && request.method === 'POST') {
      return this.apiUpdate(request);
    }
    if (path === '/do/session/destroy' && request.method === 'POST') {
      return this.apiDestroy(request);
    }
    if (path === '/do/session/size' && request.method === 'GET') {
      return jsonOk({ size: this.sessions.size });
    }

    return new Response('Not found', { status: 404 });
  }

  // -------------------------------------------------------------------------
  // Internal HTTP API handlers
  // -------------------------------------------------------------------------

  private sessionKey(id: string): string {
    return `session:${id}`;
  }

  private pairCodeKey(code: string): string {
    return `pair:${code}`;
  }

  private async saveSession(record: SessionRecord): Promise<void> {
    await this._state.storage.put(this.sessionKey(record.id), record);
    await this._state.storage.put(this.pairCodeKey(record.pairCode), record.id);
    this.sessions.set(record.id, record);
    this.pairCodes.set(record.pairCode, record.id);
  }

  private async loadSession(id: string): Promise<SessionRecord | undefined> {
    const cached = this.sessions.get(id);
    if (cached) return cached;

    const record = await this._state.storage.get<SessionRecord>(this.sessionKey(id));
    if (record) {
      this.sessions.set(id, record);
      this.pairCodes.set(record.pairCode, id);
    }
    return record;
  }

  private async loadSessionByPairCode(code: string): Promise<SessionRecord | undefined> {
    const normalized = code.replace(/\\s/g, "");
    const cachedId = this.pairCodes.get(normalized);

    if (cachedId) {
      return this.loadSession(cachedId);
    }

    const sessionId = await this._state.storage.get<string>(
      this.pairCodeKey(normalized)
    );

    if (!sessionId) return undefined;

    return this.loadSession(sessionId);
  }

  private async deleteSession(record: SessionRecord): Promise<void> {
    await this._state.storage.delete(this.sessionKey(record.id));
    await this._state.storage.delete(this.pairCodeKey(record.pairCode));
    this.sessions.delete(record.id);
    this.pairCodes.delete(record.pairCode);
  }

  private async apiCreate(request: Request): Promise<Response> {
    const body = (await request.json()) as {
      ipAddress: string;
      durationMinutes: number;
    };

    const maxMinutes = parseInt(this._env.MAX_SESSION_MINUTES ?? '60', 10);
    const duration = Math.min(body.durationMinutes ?? 30, maxMinutes);

    const id = generateSessionId();
    const pairCode = this.uniquePairCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration * 60_000);

    // Sign PC-role JWT
    const token = await signJwt({ sessionId: id, role: 'pc' }, this._env, duration);

    const record: SessionRecord = {
      id,
      pairCode,
      tokenHash: hashToken(token),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'waiting',
      ipAddress: body.ipAddress,
      deviceCount: 0,
    };

    await this.saveSession(record);

    return jsonOk({
      id,
      pairCode,
      pairCodeFormatted: formatPairCode(pairCode),
      tokenHash: record.tokenHash,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      status: record.status,
      ipAddress: record.ipAddress,
      deviceCount: 0,
      token,
    });
  }

  private async apiJoin(request: Request): Promise<Response> {
    const body = (await request.json()) as { pairCode: string; ipAddress: string };
    const rawCode = (body.pairCode ?? '').replace(/\s/g, '');

    const record = await this.loadSessionByPairCode(rawCode);
    if (!record) return jsonErr({ error: 'Session not found.' }, 404);

    if (record.status === 'destroyed' || new Date(record.expiresAt) <= new Date()) {
      await this.deleteSession(record);
      return jsonErr({ error: 'Session not found or expired.' }, 404);
    }
    if (!record) return jsonErr({ error: 'Session not found or expired.' }, 404);
    const nowMs = Date.now();
    const remainingMs = new Date(record.expiresAt).getTime() - nowMs;
    if (remainingMs <= 0) return jsonErr({ error: 'Session expired.' }, 410);

    const remainingMinutes = Math.ceil(remainingMs / 60_000);
    const token = await signJwt(
      { sessionId: record.id, role: 'phone' },
      this._env,
      remainingMinutes,
    );

    record.phoneTokenHash = hashToken(token);
    await this.saveSession(record);

    return jsonOk({ ...this.safeRecord(record), token });
  }

  private async apiGet(url: URL): Promise<Response> {
    const sessionId = url.searchParams.get('sessionId') ?? '';
    const record = await this.loadSession(sessionId);
    if (!record) return jsonErr({ error: 'Session not found.' }, 404);

    if (record.status === 'destroyed' || new Date(record.expiresAt) <= new Date()) {
      await this.deleteSession(record);
      return jsonErr({ error: 'Session not found.' }, 404);
    }

    return jsonOk(this.safeRecord(record));
  }

  private async apiGetByPairCode(url: URL): Promise<Response> {
    const pairCode = url.searchParams.get('pairCode') ?? '';
    const record = await this.loadSessionByPairCode(pairCode);

    if (!record) return jsonErr({ error: 'Session not found.' }, 404);

    if (record.status === 'destroyed' || new Date(record.expiresAt) <= new Date()) {
      await this.deleteSession(record);
      return jsonErr({ error: 'Session not found.' }, 404);
    }

    return jsonOk(this.safeRecord(record));
  }

  private async apiUpdate(request: Request): Promise<Response> {
    const body = (await request.json()) as { sessionId: string } & Partial<SessionRecord>;
    const { sessionId, ...patch } = body;
    const record = await this.loadSession(sessionId);
    if (!record) return jsonErr({ error: 'Session not found.' }, 404);
    Object.assign(record, patch);
    await this.saveSession(record);
    return jsonOk({ ok: true });
  }

  private async apiDestroy(request: Request): Promise<Response> {
    const body = (await request.json()) as { sessionId: string };
    this.destroySession(body.sessionId, 'API destroy request');
    return jsonOk({ destroyed: true });
  }

  // -------------------------------------------------------------------------
  // WebSocket upgrade
  // -------------------------------------------------------------------------

  private handleWebSocketUpgrade(request: Request, _url: URL): Response {
    const clientIp = request.headers.get('CF-Connecting-IP') ?? 'unknown';

    // Rate limit connections by IP
    if (!this.connRateLimiter.check(clientIp)) {
      return new Response('Rate limited', { status: 429 });
    }

    const pair = new WebSocketPair();
    // pair[0] is the client-facing socket (returned to caller)
    // pair[1] is the server-facing socket (accepted by the DO)
    const client = (pair as unknown as Record<string, WebSocket>)['0'];
    const server = (pair as unknown as Record<string, WebSocket>)['1'];

    // Accept via Hibernation API — server messages come via webSocketMessage()
    this._state.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as ResponseInit & { webSocket: WebSocket });
  }

  // -------------------------------------------------------------------------
  // Hibernation API callbacks
  // -------------------------------------------------------------------------

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const raw = typeof message === 'string' ? message : new TextDecoder().decode(message);

    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      sendWs(ws, { type: 'error', sessionId: '', payload: { code: 'INVALID_JSON', message: 'Message must be valid JSON.' } });
      return;
    }

    if (!msg.type) {
      sendWs(ws, { type: 'error', sessionId: '', payload: { code: 'INVALID_MESSAGE', message: 'Missing message type.' } });
      return;
    }

    // Per-message rate limiting using attachment (sessionId) as key if available
    const attach = ws.deserializeAttachment() as WsAttachment | null;
    const rateLimitKey = attach ? `msg:${attach.sessionId}:${attach.role}` : `msg:unjoined`;
    if (!this.msgRateLimiter.check(rateLimitKey)) {
      sendWs(ws, { type: 'error', sessionId: (msg.sessionId as string) ?? '', payload: { code: 'RATE_LIMITED', message: 'Too many messages.' } });
      return;
    }

    try {
      switch (msg.type) {
        case 'join':
          await this.wsHandleJoin(ws, msg);
          break;
        case 'offer':
        case 'answer':
        case 'ice-candidate':
          this.wsRelay(ws, msg);
          break;
        case 'destroy':
          this.wsHandleDestroy(ws, msg);
          break;
        case 'ping':
          sendWs(ws, { type: 'pong', sessionId: msg.sessionId, payload: { timestamp: Date.now() } });
          break;
        default:
          sendWs(ws, { type: 'error', sessionId: (msg.sessionId as string) ?? '', payload: { code: 'UNKNOWN_TYPE', message: 'Unknown message type.' } });
      }
    } catch (err) {
      console.error('[WS] Error handling message:', err);
      sendWs(ws, { type: 'error', sessionId: (msg.sessionId as string) ?? '', payload: { code: 'SERVER_ERROR', message: 'Internal error.' } });
    }
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
    this.wsHandleDisconnect(ws);
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    this.wsHandleDisconnect(ws);
  }

  // -------------------------------------------------------------------------
  // WebSocket message handlers
  // -------------------------------------------------------------------------

  private async wsHandleJoin(ws: WebSocket, msg: Record<string, unknown>): Promise<void> {
    const sessionId = msg.sessionId as string;
    const payload   = (msg.payload ?? {}) as Record<string, unknown>;
    const role      = payload.role as PeerRole;
    const token     = payload.token as string;

    if (!sessionId || !role || !token) {
      sendWs(ws, { type: 'error', sessionId: sessionId ?? '', payload: { code: 'INVALID_JOIN', message: 'sessionId, role, and token are required.' } });
      return;
    }

    const record = await this.loadSession(sessionId);
    if (!record) {
      sendWs(ws, { type: 'error', sessionId, payload: { code: 'SESSION_NOT_FOUND', message: 'Session not found or expired.' } });
      return;
    }
    if (record.status === 'destroyed') {
      sendWs(ws, { type: 'error', sessionId, payload: { code: 'SESSION_DESTROYED', message: 'Session has been destroyed.' } });
      return;
    }

    // Verify JWT
    let decoded: Record<string, unknown>;
    try {
      decoded = await verifyJwt(token, this._env);
    } catch {
      sendWs(ws, { type: 'error', sessionId, payload: { code: 'INVALID_TOKEN', message: 'Invalid or expired token.' } });
      return;
    }

    if ((decoded.sessionId as string) !== sessionId) {
      sendWs(ws, { type: 'error', sessionId, payload: { code: 'INVALID_TOKEN', message: 'Token does not match session.' } });
      return;
    }

    // Validate token hash
    const expectedHash = role === 'phone' ? record.phoneTokenHash : record.tokenHash;
    if (expectedHash && hashToken(token) !== expectedHash) {
      sendWs(ws, { type: 'error', sessionId, payload: { code: 'INVALID_TOKEN', message: 'Token hash mismatch.' } });
      return;
    }

    // Register peer
    if (!this.peers.has(sessionId)) this.peers.set(sessionId, {});
    const peerMap = this.peers.get(sessionId)!;

    // Close old WebSocket if same role reconnects
    const existing = peerMap[role];
    if (existing) {
      try { existing.close(1001, 'Replaced'); } catch { /* ignore */ }
    }

    peerMap[role] = ws;
    record.deviceCount = Object.keys(peerMap).length;

    // Persist current device count
    await this.saveSession(record);

    // Attach metadata for future message routing
    ws.serializeAttachment({ sessionId, role } satisfies WsAttachment);

    const otherRole: PeerRole = role === 'pc' ? 'phone' : 'pc';
    const peerWs = peerMap[otherRole];

    if (peerWs) {
      // Both peers connected — go active
      record.status = 'active';
      await this.saveSession(record);
      sendWs(ws,     { type: 'paired', sessionId, payload: { role, peerRole: otherRole } });
      sendWs(peerWs, { type: 'paired', sessionId, payload: { role: otherRole, peerRole: role } });
    } else {
      // First device
      record.status = 'paired';
      await this.saveSession(record);
    }
  }

  private wsRelay(ws: WebSocket, msg: Record<string, unknown>): void {
    const attach = ws.deserializeAttachment() as WsAttachment | null;
    if (!attach) {
      sendWs(ws, { type: 'error', sessionId: (msg.sessionId as string) ?? '', payload: { code: 'NOT_JOINED', message: 'Must join before relaying.' } });
      return;
    }

    const peerMap = this.peers.get(attach.sessionId);
    const otherRole: PeerRole = attach.role === 'pc' ? 'phone' : 'pc';
    const targetWs = peerMap?.[otherRole];

    if (!targetWs) {
      sendWs(ws, { type: 'error', sessionId: attach.sessionId, payload: { code: 'PEER_NOT_CONNECTED', message: 'Other device not connected.' } });
      return;
    }

    sendWs(targetWs, msg);
  }

  private wsHandleDestroy(ws: WebSocket, msg: Record<string, unknown>): void {
    const sessionId = msg.sessionId as string;
    const reason    = ((msg.payload as Record<string, unknown>)?.reason as string) ?? 'Session destroyed by peer';
    this.destroySession(sessionId, reason, ws);
  }

  private wsHandleDisconnect(ws: WebSocket): void {
    const attach = ws.deserializeAttachment() as WsAttachment | null;
    if (!attach) return;

    const { sessionId, role } = attach;
    const peerMap = this.peers.get(sessionId);
    if (!peerMap) return;

    delete peerMap[role];

    const record = this.sessions.get(sessionId);
    if (record) {
      record.deviceCount = Object.keys(peerMap).length;
      void this.saveSession(record);
    }

    // Notify remaining peer
    const otherRole: PeerRole = role === 'pc' ? 'phone' : 'pc';
    const peerWs = peerMap[otherRole];
    if (peerWs) {
      sendWs(peerWs, { type: 'peer-disconnected', sessionId, payload: { role } });
    }

    if (Object.keys(peerMap).length === 0) {
      this.peers.delete(sessionId);
      if (record) {
        record.status = 'waiting';
        void this.saveSession(record);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Session lifecycle helpers
  // -------------------------------------------------------------------------

  private destroySession(sessionId: string, reason: string, initiator?: WebSocket): void {
    const peerMap = this.peers.get(sessionId) ?? {};
    const destroyMsg = { type: 'destroy', sessionId, payload: { reason } };

    for (const [, peerWs] of Object.entries(peerMap) as [PeerRole, WebSocket][]) {
      if (peerWs !== initiator) {
        sendWs(peerWs, destroyMsg);
        try { peerWs.close(1000, 'Session destroyed'); } catch { /* ignore */ }
      }
    }
    if (initiator) {
      sendWs(initiator, destroyMsg);
      try { initiator.close(1000, 'Session destroyed'); } catch { /* ignore */ }
    }

    this.peers.delete(sessionId);

    const record = this.sessions.get(sessionId);
    if (record) {
      void this.deleteSession(record);
    }
  }

  private getValid(id: string): SessionRecord | undefined {
    const r = this.sessions.get(id);
    if (!r) return undefined;
    if (r.status === 'destroyed' || new Date(r.expiresAt) <= new Date()) {
      this.pairCodes.delete(r.pairCode);
      this.sessions.delete(id);
      return undefined;
    }
    return r;
  }

  private uniquePairCode(): string {
    let code = generatePairCode();
    let attempts = 0;
    while (this.pairCodes.has(code) && attempts++ < 100) {
      code = generatePairCode();
    }
    return code;
  }

  private safeRecord(r: SessionRecord): Omit<SessionRecord, 'tokenHash' | 'phoneTokenHash' | 'ipAddress'> {
    const { tokenHash: _th, phoneTokenHash: _ph, ipAddress: _ip, ...safe } = r;
    void _th; void _ph; void _ip;
    return safe;
  }

  private cleanExpired(): void {
    const now = new Date();
    for (const [id, record] of this.sessions) {
      if (new Date(record.expiresAt) <= now || record.status === 'destroyed') {
        this.pairCodes.delete(record.pairCode);
        this.sessions.delete(id);
        this.peers.delete(id);
      }
    }
    this.connRateLimiter.cleanup();
    this.msgRateLimiter.cleanup();
  }
}
