// Custom HTTP + WebSocket signaling server for OnlineCopyPaste.net
// Compiled with tsconfig.server.json (CommonJS).
// IMPORTANT: Do NOT import anything from src/lib/webrtc/ — browser-only.

import http from 'http';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { verify as jwtVerify } from 'jsonwebtoken';
import sessionStore, { hashToken } from './src/lib/session/SessionStore';
import { wsRateLimiter } from './src/lib/rate-limiter';
import type { WSMessage, PeerRole } from './src/types/index';
import type { ServerSession } from './src/lib/session/types';
import type { IncomingMessage } from 'http';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const dev = process.env.NODE_ENV !== 'production';

// ---------------------------------------------------------------------------
// Production safety: refuse to start without a real SESSION_SECRET
// ---------------------------------------------------------------------------
if (!dev && !process.env.SESSION_SECRET) {
  console.error('[FATAL] SESSION_SECRET environment variable is not set in production.');
  console.error('[FATAL] Set a strong random secret (32+ characters) before deploying.');
  process.exit(1);
}

function getSessionSecret(): string {
  return process.env.SESSION_SECRET ?? 'dev-secret-change-in-production-32c';
}

// ---------------------------------------------------------------------------
// Helper: send a JSON message to a WebSocket safely
// ---------------------------------------------------------------------------
function sendJSON(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      // Ignore send errors on individual connections — don't crash the server
    }
  }
}

// ---------------------------------------------------------------------------
// Helper: send an error message to a WebSocket
// ---------------------------------------------------------------------------
function sendError(ws: WebSocket, sessionId: string, code: string, message: string): void {
  sendJSON(ws, {
    type: 'error',
    sessionId,
    payload: { code, message },
  });
}

// ---------------------------------------------------------------------------
// Helper: get the opposite peer role
// ---------------------------------------------------------------------------
function otherRole(role: PeerRole): PeerRole {
  return role === 'pc' ? 'phone' : 'pc';
}

// ---------------------------------------------------------------------------
// Helper: extract client IP
// ---------------------------------------------------------------------------
function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return first.trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

// ---------------------------------------------------------------------------
// Bootstrap Next.js app
// ---------------------------------------------------------------------------
const app = next({ dev, hostname: 'localhost', port: PORT });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // -------------------------------------------------------------------------
  // HTTP server — delegates all requests to Next.js
  // -------------------------------------------------------------------------
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  // -------------------------------------------------------------------------
  // WebSocket server attached to the same HTTP server
  // -------------------------------------------------------------------------
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Track WebSocket → { sessionId, role } for cleanup on close
  const wsMetadata = new Map<WebSocket, { sessionId: string; role: PeerRole }>();

  // Heartbeat: ping every 30 seconds to detect dead connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as WebSocket & { isAlive?: boolean };
      if (extWs.isAlive === false) {
        extWs.terminate();
        return;
      }
      extWs.isAlive = false;
      extWs.ping();
    });
  }, 30_000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const extWs = ws as WebSocket & { isAlive?: boolean };
    extWs.isAlive = true;

    const clientIp = getClientIp(req);

    // Mark alive on pong
    ws.on('pong', () => {
      extWs.isAlive = true;
    });

    // Rate limit new WebSocket connections by IP
    if (!wsRateLimiter.check(clientIp)) {
      sendError(ws, '', 'RATE_LIMITED', 'Too many connections. Please wait before reconnecting.');
      ws.close(1008, 'Rate limited');
      return;
    }

    ws.on('message', (data: Buffer | string) => {
      // Rate limit messages per connection (use a per-socket key)
      const socketKey = `ws:${clientIp}:${uuidv4().slice(0, 8)}`;

      let msg: WSMessage;
      try {
        msg = JSON.parse(data.toString()) as WSMessage;
      } catch {
        sendError(ws, '', 'INVALID_JSON', 'Message must be valid JSON.');
        return;
      }

      // All non-join messages must have a sessionId
      if (!msg.type) {
        sendError(ws, '', 'INVALID_MESSAGE', 'Missing message type.');
        return;
      }

      // Per-message rate limiting (use connection identity stored in metadata or IP)
      const meta = wsMetadata.get(ws);
      const rateLimitKey = meta ? `msg:${meta.sessionId}:${meta.role}` : `msg:${clientIp}`;
      if (!wsRateLimiter.check(rateLimitKey)) {
        sendError(ws, msg.sessionId ?? '', 'RATE_LIMITED', 'Too many messages.');
        return;
      }

      // Prevent unused variable warning
      void socketKey;

      // -----------------------------------------------------------------------
      // Message handlers
      // -----------------------------------------------------------------------
      try {
        switch (msg.type) {
          case 'join': {
            handleJoin(ws, msg.sessionId, msg.payload.role, msg.payload.token, clientIp);
            break;
          }
          case 'offer':
          case 'answer':
          case 'ice-candidate': {
            relayMessage(ws, msg);
            break;
          }
          case 'destroy': {
            handleDestroy(ws, msg.sessionId, msg.payload?.reason);
            break;
          }
          case 'ping': {
            sendJSON(ws, {
              type: 'pong',
              sessionId: msg.sessionId,
              payload: { timestamp: Date.now() },
            });
            break;
          }
          default: {
            sendError(ws, (msg as WSMessage).sessionId ?? '', 'UNKNOWN_TYPE', `Unknown message type.`);
          }
        }
      } catch (err) {
        // Never crash the process on a single bad message
        console.error('[WS] Error handling message:', err);
        sendError(ws, msg.sessionId ?? '', 'SERVER_ERROR', 'Internal server error.');
      }
    });

    ws.on('close', () => {
      handleDisconnect(ws);
    });

    ws.on('error', (err) => {
      console.error('[WS] Socket error:', err.message);
    });
  });

  // -------------------------------------------------------------------------
  // Handler: join
  // -------------------------------------------------------------------------
  function handleJoin(
    ws: WebSocket,
    sessionId: string,
    role: PeerRole,
    token: string,
    clientIp: string,
  ): void {
    if (!sessionId || !role || !token) {
      sendError(ws, sessionId ?? '', 'INVALID_JOIN', 'sessionId, role, and token are required.');
      return;
    }

    const session = sessionStore.get(sessionId);
    if (!session) {
      sendError(ws, sessionId, 'SESSION_NOT_FOUND', 'Session not found or expired.');
      return;
    }

    if (session.status === 'destroyed') {
      sendError(ws, sessionId, 'SESSION_DESTROYED', 'This session has been destroyed.');
      return;
    }

    if (new Date() > session.expiresAt) {
      sendError(ws, sessionId, 'SESSION_EXPIRED', 'Session has expired.');
      return;
    }

    // Verify JWT
    try {
      const decoded = jwtVerify(token, getSessionSecret()) as { sessionId: string; role: string };
      if (decoded.sessionId !== sessionId) {
        sendError(ws, sessionId, 'INVALID_TOKEN', 'Token does not match session.');
        return;
      }
    } catch {
      sendError(ws, sessionId, 'INVALID_TOKEN', 'Invalid or expired token.');
      return;
    }

    // Validate token hash if set
    if (session.tokenHash) {
      const incoming = hashToken(token);
      if (incoming !== session.tokenHash) {
        sendError(ws, sessionId, 'INVALID_TOKEN', 'Token does not match session record.');
        return;
      }
    }

    // Register this WebSocket as the role's peer
    if (session.peers[role]) {
      // Existing peer for this role — close the old connection
      const oldWs = session.peers[role]!;
      wsMetadata.delete(oldWs);
      oldWs.close(1001, 'Replaced by new connection');
    }

    session.peers[role] = ws;
    session.deviceCount = Object.keys(session.peers).length;
    wsMetadata.set(ws, { sessionId, role });

    void clientIp;

    // Check if both peers are now connected
    const peer = session.peers[otherRole(role)];
    if (peer && peer.readyState === WebSocket.OPEN) {
      // Both devices connected — transition to paired/active
      sessionStore.update(sessionId, { status: 'active' });

      // Notify the joining peer
      sendJSON(ws, {
        type: 'paired',
        sessionId,
        payload: { role, peerRole: otherRole(role) },
      });

      // Notify the existing peer
      sendJSON(peer, {
        type: 'paired',
        sessionId,
        payload: { role: otherRole(role), peerRole: role },
      });
    } else {
      // First device — waiting for the other
      sessionStore.update(sessionId, { status: 'paired' });
      // Acknowledge the join without pairing yet
    }
  }

  // -------------------------------------------------------------------------
  // Handler: relay (offer / answer / ice-candidate)
  // -------------------------------------------------------------------------
  function relayMessage(ws: WebSocket, msg: WSMessage): void {
    const meta = wsMetadata.get(ws);
    if (!meta) {
      sendError(ws, msg.sessionId, 'NOT_JOINED', 'Must join a session before relaying.');
      return;
    }

    const session = sessionStore.get(meta.sessionId);
    if (!session) {
      sendError(ws, msg.sessionId, 'SESSION_NOT_FOUND', 'Session not found.');
      return;
    }

    const targetRole = otherRole(meta.role);
    const targetWs = session.peers[targetRole];
    if (!targetWs || targetWs.readyState !== WebSocket.OPEN) {
      sendError(ws, msg.sessionId, 'PEER_NOT_CONNECTED', 'The other device is not connected.');
      return;
    }

    // Relay as-is
    sendJSON(targetWs, msg);
  }

  // -------------------------------------------------------------------------
  // Handler: destroy
  // -------------------------------------------------------------------------
  function handleDestroy(ws: WebSocket, sessionId: string, reason?: string): void {
    const session = sessionStore.get(sessionId);
    if (!session) {
      sendError(ws, sessionId, 'SESSION_NOT_FOUND', 'Session not found.');
      return;
    }

    // Notify all connected peers before destroying
    const destroyMsg = {
      type: 'destroy',
      sessionId,
      payload: { reason: reason ?? 'Session destroyed by peer' },
    };
    for (const role of ['pc', 'phone'] as PeerRole[]) {
      const peerWs = session.peers[role];
      if (peerWs && peerWs !== ws && peerWs.readyState === WebSocket.OPEN) {
        sendJSON(peerWs, destroyMsg);
        peerWs.close(1000, 'Session destroyed');
      }
      if (peerWs) wsMetadata.delete(peerWs);
    }

    sessionStore.destroy(sessionId);

    // Acknowledge to the sender
    sendJSON(ws, destroyMsg);
    ws.close(1000, 'Session destroyed');
    wsMetadata.delete(ws);
  }

  // -------------------------------------------------------------------------
  // Handler: WebSocket close (cleanup)
  // -------------------------------------------------------------------------
  function handleDisconnect(ws: WebSocket): void {
    const meta = wsMetadata.get(ws);
    if (!meta) return;

    const { sessionId, role } = meta;
    wsMetadata.delete(ws);

    const session = sessionStore.get(sessionId);
    if (!session) return;

    // Remove this peer from the session
    delete session.peers[role];
    session.deviceCount = Object.keys(session.peers).length;

    // Notify the remaining peer
    const peerRole = otherRole(role);
    const peerWs = session.peers[peerRole];
    if (peerWs && peerWs.readyState === WebSocket.OPEN) {
      sendJSON(peerWs, {
        type: 'peer-disconnected',
        sessionId,
        payload: { role },
      });
    }

    // If no peers remain, mark session as waiting
    if (session.deviceCount === 0) {
      sessionStore.update(sessionId, { status: 'waiting' });
    }
  }

  // -------------------------------------------------------------------------
  // Start listening
  // -------------------------------------------------------------------------
  server.listen(PORT, () => {
    console.log(`> OnlineCopyPaste server ready on http://localhost:${PORT}`);
    console.log(`> WebSocket signaling at ws://localhost:${PORT}/ws`);
    console.log(`> Mode: ${dev ? 'development' : 'production'}`);
  });

  server.on('error', (err) => {
    console.error('[HTTP] Server error:', err);
    process.exit(1);
  });
});
