// Server-side session types
// This file is included in tsconfig.server.json — CommonJS-compatible only.

import type WebSocket from 'ws';
import type { SessionStatus } from '@/types/index';

export interface ServerSession {
  id: string;
  pairCode: string;
  /** sha256 hex of the JWT token issued at creation */
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  status: SessionStatus;
  peers: {
    pc?: WebSocket;
    phone?: WebSocket;
  };
  deviceCount: number;
  ipAddress: string;
}

/** Maps a 6-digit pair code to a sessionId */
export type PairCodeMap = Map<string, string>;
