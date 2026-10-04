// In-memory session store singleton.
// This file is included in tsconfig.server.json — CommonJS-compatible only.
// Do NOT import WebRTC globals or browser-only APIs here.

import { generateSessionId, generatePairCode, hashToken } from './utils';
import type { ServerSession, PairCodeMap } from './types';

const MAX_SESSION_MINUTES = parseInt(process.env.MAX_SESSION_MINUTES ?? '60', 10);

class SessionStore {
  private sessions: Map<string, ServerSession> = new Map();
  private pairCodes: PairCodeMap = new Map();

  /**
   * Create a new session for the given IP address and duration.
   * Returns the created ServerSession.
   */
  create(ipAddress: string, durationMinutes: number = MAX_SESSION_MINUTES): ServerSession {
    const id = generateSessionId();
    const pairCode = this._uniquePairCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    // tokenHash is set to empty string at creation; the API route sets it after
    // signing the JWT so the store doesn't need to import jsonwebtoken.
    const session: ServerSession = {
      id,
      pairCode,
      tokenHash: '',
      createdAt: now,
      expiresAt,
      status: 'waiting',
      peers: {},
      deviceCount: 0,
      ipAddress,
    };

    this.sessions.set(id, session);
    this.pairCodes.set(pairCode, id);
    return session;
  }

  /** Retrieve a session by its ID. Returns undefined if not found. */
  get(id: string): ServerSession | undefined {
    return this.sessions.get(id);
  }

  /** Retrieve a session by its 6-digit pair code. */
  getByPairCode(code: string): ServerSession | undefined {
    const id = this.pairCodes.get(code);
    if (!id) return undefined;
    return this.sessions.get(id);
  }

  /** Partially update a session by ID. */
  update(id: string, partial: Partial<ServerSession>): void {
    const session = this.sessions.get(id);
    if (!session) return;
    Object.assign(session, partial);
  }

  /** Destroy a session, removing it from both maps. */
  destroy(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;
    this.pairCodes.delete(session.pairCode);
    this.sessions.delete(id);
  }

  /** Remove all expired sessions. Called automatically every 60 seconds. */
  cleanup(): void {
    const now = new Date();
    for (const [id, session] of this.sessions) {
      if (session.expiresAt <= now || session.status === 'destroyed') {
        this.pairCodes.delete(session.pairCode);
        this.sessions.delete(id);
      }
    }
  }

  /** Return the total number of active sessions (for monitoring). */
  size(): number {
    return this.sessions.size;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Generate a pair code that doesn't collide with an existing session. */
  private _uniquePairCode(): string {
    let code = generatePairCode();
    let attempts = 0;
    while (this.pairCodes.has(code) && attempts < 100) {
      code = generatePairCode();
      attempts++;
    }
    return code;
  }
}

// Singleton — the same instance is used across the whole server process.
const sessionStore = new SessionStore();

// Automatically clean up expired sessions every 60 seconds.
setInterval(() => {
  sessionStore.cleanup();
}, 60_000);

export { hashToken };
export default sessionStore;
