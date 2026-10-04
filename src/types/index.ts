// Shared TypeScript types for OnlineCopyPaste.net
// Used by both the Next.js app and the server (CommonJS-compatible)

// ---------------------------------------------------------------------------
// Enums / Union Types
// ---------------------------------------------------------------------------

export type SessionStatus = 'waiting' | 'paired' | 'active' | 'destroyed';

export type ContentType = 'text' | 'code' | 'url' | 'json' | 'image' | 'pdf' | 'zip' | 'document' | 'other';

export type ConnectionMode = 'online' | 'local' | 'offline';

export type PeerRole = 'pc' | 'phone';

export type TransferStatus = 'pending' | 'transferring' | 'completed' | 'failed' | 'cancelled';

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export interface Session {
  id: string;
  pairCode: string;
  createdAt: Date;
  expiresAt: Date;
  status: SessionStatus;
  deviceCount: number;
}

// ---------------------------------------------------------------------------
// WebSocket Message Protocol (discriminated union)
// ---------------------------------------------------------------------------

export interface WSMessageJoin {
  type: 'join';
  sessionId: string;
  payload: { role: PeerRole; token: string };
}

export interface WSMessagePaired {
  type: 'paired';
  sessionId: string;
  payload: { role: PeerRole; peerRole: string };
}

export interface WSMessageOffer {
  type: 'offer';
  sessionId: string;
  payload: { sdp: RTCSessionDescriptionInit };
}

export interface WSMessageAnswer {
  type: 'answer';
  sessionId: string;
  payload: { sdp: RTCSessionDescriptionInit };
}

export interface WSMessageIceCandidate {
  type: 'ice-candidate';
  sessionId: string;
  payload: { candidate: RTCIceCandidateInit };
}

export interface WSMessageDestroy {
  type: 'destroy';
  sessionId: string;
  payload: { reason?: string };
}

export interface WSMessagePing {
  type: 'ping';
  sessionId: string;
  payload: Record<string, never>;
}

export interface WSMessagePong {
  type: 'pong';
  sessionId: string;
  payload: { timestamp: number };
}

export interface WSMessageError {
  type: 'error';
  sessionId: string;
  payload: { code: string; message: string };
}

export interface WSMessagePeerDisconnected {
  type: 'peer-disconnected';
  sessionId: string;
  payload: { role: PeerRole };
}

export type WSMessage =
  | WSMessageJoin
  | WSMessagePaired
  | WSMessageOffer
  | WSMessageAnswer
  | WSMessageIceCandidate
  | WSMessageDestroy
  | WSMessagePing
  | WSMessagePong
  | WSMessageError
  | WSMessagePeerDisconnected;

// ---------------------------------------------------------------------------
// File / Transfer Types
// ---------------------------------------------------------------------------

export interface FileMeta {
  transferId: string;
  name: string;
  size: number;
  mimeType: string;
  totalChunks: number;
}

export interface FileChunkHeader {
  transferId: string; // 16 ASCII hex chars (bytes 0–15)
  chunkIndex: number; // big-endian uint32 (bytes 16–19)
}

export interface TransferState {
  transferId: string;
  name: string;
  size: number;
  mimeType: string;
  totalChunks: number;
  receivedChunks: number;
  status: TransferStatus;
  progress: number; // 0–100
  direction: 'sending' | 'receiving';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  objectUrl?: string; // set after assembly
}

// ---------------------------------------------------------------------------
// UI Types
// ---------------------------------------------------------------------------

export interface AdSlotProps {
  slot: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  className?: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  durationMs?: number;
}
