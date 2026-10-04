'use client';

import React, { useEffect, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionTimerProps {
  expiresAt: Date;
  onExpired?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Countdown timer showing time remaining before session expires.
 * - Displays as MM:SS or HH:MM:SS
 * - Turns red when < 5 minutes remain
 * - Shows 'Session expired' when done, calls onExpired()
 */
export default function SessionTimer({ expiresAt, onExpired }: SessionTimerProps) {
  const getRemaining = useCallback(() => expiresAt.getTime() - Date.now(), [expiresAt]);

  const [remaining, setRemaining] = useState<number>(getRemaining);
  const [expired, setExpired] = useState<boolean>(false);

  useEffect(() => {
    const tick = () => {
      const ms = getRemaining();
      if (ms <= 0) {
        setRemaining(0);
        setExpired(true);
        onExpired?.();
        return;
      }
      setRemaining(ms);
    };

    tick(); // immediate update on mount / expiresAt change

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [getRemaining, onExpired]);

  const isWarning = remaining < 5 * 60 * 1000; // < 5 minutes

  if (expired) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400 ring-1 ring-red-500/30"
        role="status"
        aria-live="polite"
      >
        Session expired
      </span>
    );
  }

  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-mono font-medium',
        isWarning
          ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
          : 'bg-slate-700 text-slate-300',
      ].join(' ')}
      role="timer"
      aria-label={`Session expires in ${formatRemaining(remaining)}`}
      aria-live="off"
    >
      <span aria-hidden="true">⏱</span>
      {formatRemaining(remaining)}
    </span>
  );
}
