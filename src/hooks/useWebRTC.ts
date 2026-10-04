'use client';

// CRITICAL: RTCPeerConnection must NEVER be instantiated at module level.
// All WebRTC code runs inside useEffect only, after the component has mounted.

import { useEffect, useRef, useState, useCallback } from 'react';
import type { PeerRole, WSMessage } from '@/types/index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseWebRTCOptions {
  sessionId: string;
  token: string;
  role: PeerRole;
}

export interface UseWebRTCResult {
  isConnected: boolean;
  isPaired: boolean;
  connectionState: RTCPeerConnectionState | 'new';
  reconnecting: boolean;
  wsRef: React.MutableRefObject<WebSocket | null>;
  send: (data: string | ArrayBuffer) => void;
  sendFile: (file: File, transferId: string) => Promise<void>;
  onMessage: (handler: (data: string | ArrayBuffer) => void) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY_MS = 2000;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Core WebRTC hook — manages:
 * 1. WebSocket signaling connection (with 3-retry exponential backoff reconnect)
 * 2. RTCPeerConnection lifecycle (offer/answer/ICE, initiated INSIDE useEffect)
 * 3. DataChannel send/receive
 * 4. ICE candidate queuing before remote description is set
 * 5. Peer-disconnected handling with reconnect
 *
 * PC role: creates offer after paired.
 * Phone role: waits for offer, creates answer.
 */
export function useWebRTC({
  sessionId,
  token,
  role,
}: UseWebRTCOptions): UseWebRTCResult {
  const [isConnected, setIsConnected] = useState(false);
  const [isPaired, setIsPaired] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | 'new'>('new');
  const [reconnecting, setReconnecting] = useState(false);

  // Refs — stable across renders, mutable
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<import('@/lib/webrtc/PeerConnection').PeerConnection | null>(null);
  const dcManagerRef = useRef<import('@/lib/webrtc/DataChannel').DataChannelManager | null>(null);
  const messageHandlerRef = useRef<((data: string | ArrayBuffer) => void) | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSetRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const isPairedRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const flushIceCandidates = useCallback(async () => {
    if (!pcRef.current || iceCandidateQueueRef.current.length === 0) return;
    const queued = iceCandidateQueueRef.current.splice(0);
    for (const candidate of queued) {
      try {
        await pcRef.current.addIceCandidate(candidate);
      } catch {
        // Stale candidate — ignore
      }
    }
  }, []);

  const sendWS = useCallback((message: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const createPeerConnection = useCallback(async () => {
    // Dynamic imports — browser-only modules, safe inside useEffect/callbacks
    const { PeerConnection } = await import('@/lib/webrtc/PeerConnection');
    const { DataChannelManager } = await import('@/lib/webrtc/DataChannel');
    const { getIceServers } = await import('@/lib/webrtc/config');

    const pc = new PeerConnection(
      getIceServers(),
      // onIceCandidate
      (candidate) => {
        sendWS({
          type: 'ice-candidate',
          sessionId,
          payload: { candidate },
        });
      },
      // onDataChannel (phone role receives the channel)
      (channel) => {
        const manager = new DataChannelManager(
          (progress) => {
            if (messageHandlerRef.current) {
              messageHandlerRef.current(JSON.stringify({ type: '_progress', ...progress }));
            }
          },
          (transferId, blob, meta) => {
            if (messageHandlerRef.current) {
              const url = URL.createObjectURL(blob);
              messageHandlerRef.current(
                JSON.stringify({ type: '_file_ready', transferId, url, meta }),
              );
            }
          },
          (content, contentType) => {
            if (messageHandlerRef.current) {
              messageHandlerRef.current(
                JSON.stringify({ type: 'text', content, contentType }),
              );
            }
          },
        );
        manager.openChannel(channel);
        dcManagerRef.current = manager;
        setIsConnected(true);
        setConnectionState('connected');
      },
      // onConnectionStateChange
      (state) => {
        if (!mountedRef.current) return;
        setConnectionState(state);
        if (state === 'connected') {
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
          setReconnecting(false);
        } else if (state === 'disconnected' || state === 'failed') {
          setIsConnected(false);
        }
      },
    );

    pcRef.current = pc;
    remoteDescSetRef.current = false;

    // PC role creates a DataChannel and the offer
    if (role === 'pc') {
      const channel = pc.createDataChannel('ocp-transfer', { ordered: true });
      const manager = new DataChannelManager(
        (progress) => {
          if (messageHandlerRef.current) {
            messageHandlerRef.current(JSON.stringify({ type: '_progress', ...progress }));
          }
        },
        (transferId, blob, meta) => {
          if (messageHandlerRef.current) {
            const url = URL.createObjectURL(blob);
            messageHandlerRef.current(
              JSON.stringify({ type: '_file_ready', transferId, url, meta }),
            );
          }
        },
        (content, contentType) => {
          if (messageHandlerRef.current) {
            messageHandlerRef.current(
              JSON.stringify({ type: 'text', content, contentType }),
            );
          }
        },
      );
      manager.openChannel(channel);
      dcManagerRef.current = manager;

      channel.onopen = () => {
        setIsConnected(true);
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        setReconnecting(false);
      };

      const offer = await pc.createOffer();
      sendWS({ type: 'offer', sessionId, payload: { sdp: offer } });
    }
  }, [sessionId, role, sendWS]);

  // ---------------------------------------------------------------------------
  // WebSocket setup
  // ---------------------------------------------------------------------------

  const connectWebSocket = useCallback(() => {
    if (!mountedRef.current) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? `ws://${window.location.host}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      // Invalid URL or blocked — don't crash
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      reconnectAttemptsRef.current = 0;
      setReconnecting(false);

      // Authenticate + join session
      ws.send(
        JSON.stringify({
          type: 'join',
          sessionId,
          payload: { role, token },
        }),
      );
    };

    ws.onmessage = async (event) => {
      if (!mountedRef.current) return;

      let msg: WSMessage;
      try {
        msg = JSON.parse(event.data as string) as WSMessage;
      } catch {
        return;
      }

      switch (msg.type) {
        case 'paired': {
          setIsPaired(true);
          isPairedRef.current = true;
          // PC role initiates the WebRTC handshake
          if (role === 'pc' && !pcRef.current) {
            await createPeerConnection();
          }
          break;
        }

        case 'offer': {
          // Phone role receives the offer
          if (role === 'phone') {
            if (!pcRef.current) {
              await createPeerConnection();
            }
            if (pcRef.current) {
              const answer = await pcRef.current.createAnswer(msg.payload.sdp);
              remoteDescSetRef.current = true;
              await flushIceCandidates();
              sendWS({ type: 'answer', sessionId, payload: { sdp: answer } });
            }
          }
          break;
        }

        case 'answer': {
          // PC role receives the answer
          if (role === 'pc' && pcRef.current) {
            await pcRef.current.setRemoteDescription(msg.payload.sdp);
            remoteDescSetRef.current = true;
            await flushIceCandidates();
          }
          break;
        }

        case 'ice-candidate': {
          if (remoteDescSetRef.current && pcRef.current) {
            try {
              await pcRef.current.addIceCandidate(msg.payload.candidate);
            } catch {
              // Stale/invalid candidate — ignore
            }
          } else {
            // Queue candidate until remote description is set
            iceCandidateQueueRef.current.push(msg.payload.candidate);
          }
          break;
        }

        case 'peer-disconnected': {
          setIsPaired(false);
          isPairedRef.current = false;
          setIsConnected(false);
          // Clean up existing peer connection
          if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
          }
          dcManagerRef.current = null;
          remoteDescSetRef.current = false;
          iceCandidateQueueRef.current = [];

          // Attempt reconnect if we haven't exceeded the limit
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            const attempt = reconnectAttemptsRef.current;
            const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt);
            reconnectAttemptsRef.current++;
            setReconnecting(true);

            reconnectTimerRef.current = setTimeout(() => {
              if (!mountedRef.current) return;
              // Re-join to signal waiting for peer
              sendWS({ type: 'join', sessionId, payload: { role, token } });
            }, delay);
          } else {
            setReconnecting(false);
          }
          break;
        }

        case 'destroy': {
          setIsPaired(false);
          setIsConnected(false);
          if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
          }
          break;
        }

        case 'error': {
          console.warn('[useWebRTC] Server error:', msg.payload.code, msg.payload.message);
          break;
        }

        case 'pong':
        case 'ping':
          // Heartbeat — no action needed
          break;

        default:
          break;
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror — handle reconnect there
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;

      // Attempt WebSocket reconnect with exponential backoff
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const attempt = reconnectAttemptsRef.current;
        const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt);
        reconnectAttemptsRef.current++;
        setReconnecting(true);

        reconnectTimerRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          connectWebSocket();
        }, delay);
      } else {
        setReconnecting(false);
      }
    };
  }, [sessionId, token, role, sendWS, createPeerConnection, flushIceCandidates]);

  // ---------------------------------------------------------------------------
  // Mount / unmount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;

    connectWebSocket();

    return () => {
      mountedRef.current = false;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      if (wsRef.current) {
        // Remove event handlers before closing to prevent reconnect on unmount
        const ws = wsRef.current;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.onopen = null;
        ws.close();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  const send = useCallback((data: string | ArrayBuffer) => {
    if (!dcManagerRef.current) return;
    if (typeof data === 'string') {
      // Parse as a structured message or send as plain text
      try {
        const parsed = JSON.parse(data) as { contentType?: string; content?: string };
        if (parsed.content !== undefined) {
          dcManagerRef.current.sendText(
            parsed.content,
            (parsed.contentType as import('@/types/index').ContentType) ?? 'text',
          );
          return;
        }
      } catch {
        // Not JSON — send as plain text
      }
      dcManagerRef.current.sendText(data, 'text');
    }
    // ArrayBuffer: raw binary — caller handles framing (e.g., file chunks)
  }, []);

  const onMessage = useCallback((handler: (data: string | ArrayBuffer) => void) => {
    messageHandlerRef.current = handler;
  }, []);

  /**
   * Send a file over the DataChannel using the binary chunking protocol.
   * Delegates to DataChannelManager.sendFileMeta() which streams all chunks.
   */
  const sendFile = useCallback(async (file: File, transferId: string): Promise<void> => {
    if (!dcManagerRef.current) return;
    await dcManagerRef.current.sendFileMeta(file, transferId);
  }, []);

  return {
    isConnected,
    isPaired,
    connectionState,
    reconnecting,
    wsRef,
    send,
    sendFile,
    onMessage,
  };
}
