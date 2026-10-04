'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { ConnectionMode } from '@/types/index';

export interface ConnectionStatusResult {
  mode: ConnectionMode;
  isOnline: boolean;
  wsConnected: boolean;
}

/**
 * Tracks the current network/connection mode:
 * - ONLINE  — navigator.onLine is true AND /api/health responds
 * - LOCAL   — navigator.onLine is false but a LAN WebSocket connects, or health check fails
 * - OFFLINE — neither internet nor any local signaling path is reachable
 *
 * Uses navigator.onLine as a baseline, then confirms with a /api/health fetch.
 * Updates on window 'online' / 'offline' events.
 */
export function useConnectionStatus(): ConnectionStatusResult {
  const [mode, setMode] = useState<ConnectionMode>('online');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // Track whether the component is still mounted to avoid state updates after unmount
  const mountedRef = useRef(true);

  const checkOnlineStatus = useCallback(async () => {
    if (!mountedRef.current) return;

    const navigatorOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsOnline(navigatorOnline);

    if (!navigatorOnline) {
      setMode('offline');
      return;
    }

    // Confirm connectivity with a lightweight health check
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });

      if (!mountedRef.current) return;

      if (response.ok) {
        setMode('online');
        setWsConnected(true);
      } else {
        // Server reachable but unhealthy — treat as local/degraded
        setMode('local');
      }
    } catch {
      if (!mountedRef.current) return;
      // Health check failed — could be local-only network
      // Mark as LOCAL (peer-to-peer on LAN may still work via WebSocket)
      setMode('local');
      setWsConnected(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Initial check
    void checkOnlineStatus();

    const handleOnline = () => {
      setIsOnline(true);
      void checkOnlineStatus();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setMode('offline');
      setWsConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Re-check every 30 seconds in case network state changes silently
    const interval = setInterval(() => {
      void checkOnlineStatus();
    }, 30_000);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkOnlineStatus]);

  return { mode, isOnline, wsConnected };
}
