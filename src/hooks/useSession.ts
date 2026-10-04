'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { SessionStatus } from '@/types/index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionData {
  sessionId: string;
  token: string;
  pairCode: string;
  pairCodeFormatted: string;
  qrDataUrl: string;
  expiresAt: string; // ISO string
}

export interface UseSessionResult {
  session: SessionData | null;
  isLoading: boolean;
  error: string | null;
  sessionStatus: SessionStatus | null;
  createSession: (durationMinutes?: number) => Promise<void>;
  destroySession: () => Promise<void>;
  joinSession: (code: string) => Promise<SessionData | null>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSION_STORAGE_KEY = 'ocp_session';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadFromStorage(): SessionData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SessionData;
    // Check expiry
    if (new Date(data.expiresAt) <= new Date()) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveToStorage(data: SessionData): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage may be unavailable (private mode, quota exceeded)
  }
}

function clearStorage(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the lifecycle of an OnlineCopyPaste session:
 * - createSession()  — POST /api/session/create, persist to sessionStorage
 * - destroySession() — POST /api/session/destroy, clear sessionStorage
 * - joinSession()    — resolve a session by its 6-digit pair code
 *
 * On mount, restores an unexpired session from sessionStorage automatically.
 */
export function useSession(
  wsRef?: React.MutableRefObject<WebSocket | null>,
): UseSessionResult {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);

  const mountedRef = useRef(true);

  // On mount: restore session from sessionStorage if not expired
  useEffect(() => {
    mountedRef.current = true;
    const restored = loadFromStorage();
    if (restored) {
      setSession(restored);
      setSessionStatus('waiting');
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // createSession
  // ---------------------------------------------------------------------------

  const createSession = useCallback(async (durationMinutes = 30): Promise<void> => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }

      const body = (await response.json()) as {
        sessionId: string;
        pairCode: string;
        pairCodeFormatted: string;
        qrDataUrl: string;
        token: string;
        expiresAt: string;
      };

      const data: SessionData = {
        sessionId: body.sessionId,
        token: body.token,
        pairCode: body.pairCode,
        pairCodeFormatted: body.pairCodeFormatted,
        qrDataUrl: body.qrDataUrl,
        expiresAt: body.expiresAt,
      };

      if (!mountedRef.current) return;
      saveToStorage(data);
      setSession(data);
      setSessionStatus('waiting');
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // destroySession
  // ---------------------------------------------------------------------------

  const destroySession = useCallback(async (): Promise<void> => {
    if (!session) return;
    if (!mountedRef.current) return;

    setIsLoading(true);

    // Send destroy message via WebSocket if available
    if (wsRef?.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(
          JSON.stringify({
            type: 'destroy',
            sessionId: session.sessionId,
            payload: { reason: 'user_requested' },
          }),
        );
      } catch {
        // WebSocket send failure is non-fatal — proceed with HTTP destroy
      }
    }

    try {
      await fetch('/api/session/destroy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });
    } catch {
      // HTTP failure is non-fatal — clean up locally regardless
    }

    clearStorage();
    if (!mountedRef.current) return;
    setSession(null);
    setSessionStatus('destroyed');
    setIsLoading(false);
  }, [session, wsRef]);

  // ---------------------------------------------------------------------------
  // joinSession
  // ---------------------------------------------------------------------------

  const joinSession = useCallback(async (code: string): Promise<SessionData | null> => {
    if (!mountedRef.current) return null;
    setIsLoading(true);
    setError(null);

    // Normalize: strip spaces, pad to 6 digits
    const normalizedCode = code.replace(/\s/g, '').padStart(6, '0');

    try {
      // Join as 'phone' role using the pair code — uses the dedicated join endpoint
      const response = await fetch('/api/session/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairCode: normalizedCode }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }

      const body = (await response.json()) as {
        sessionId: string;
        pairCode: string;
        pairCodeFormatted: string;
        qrDataUrl: string;
        token: string;
        expiresAt: string;
      };

      const data: SessionData = {
        sessionId: body.sessionId,
        token: body.token,
        pairCode: body.pairCode,
        pairCodeFormatted: body.pairCodeFormatted,
        qrDataUrl: body.qrDataUrl,
        expiresAt: body.expiresAt,
      };

      if (!mountedRef.current) return null;
      saveToStorage(data);
      setSession(data);
      setSessionStatus('waiting');
      return data;
    } catch (err) {
      if (!mountedRef.current) return null;
      setError(err instanceof Error ? err.message : 'Failed to join session');
      return null;
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  return {
    session,
    isLoading,
    error,
    sessionStatus,
    createSession,
    destroySession,
    joinSession,
  };
}
