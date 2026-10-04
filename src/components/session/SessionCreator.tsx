'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { useSession } from '@/hooks/useSession';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionCreatorProps {
  onSessionCreated?: (sessionId: string, token: string) => void;
}

type Duration = 10 | 30 | 60;

const DURATIONS: { value: Duration; label: string }[] = [
  { value: 10, label: '10 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Main session creation UI.
 * - Duration selector (10 min / 30 min / 1 hour)
 * - Start Session button → calls useSession.createSession()
 * - On success: shows QR code, 6-digit pair code, join URL, Copy Link button
 * - After pairing: Go to Workspace button
 */
export default function SessionCreator({ onSessionCreated }: SessionCreatorProps) {
  const [duration, setDuration] = useState<Duration>(30);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const { session, isLoading, error, createSession } = useSession();

  const handleStart = async () => {
    await createSession(duration);
  };

  const handleCopyLink = async () => {
    if (!session) return;
    const joinUrl = `${window.location.origin}/join/${session.pairCode}`;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available — silently ignore
    }
  };

  const handleGoToWorkspace = () => {
    if (!session) return;
    onSessionCreated?.(session.sessionId, session.token);
    // Session data is already in sessionStorage (saved by useSession.createSession).
    // Navigate with only the role — no sensitive token in the URL.
    router.push('/app?role=pc');
  };

  const joinUrl = session
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://onlinecopypaste.net'}/join/${session.pairCode}`
    : '';

  // ---------------------------------------------------------------------------
  // After session created: show QR + pair code
  // ---------------------------------------------------------------------------

  if (session) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-slate-700 bg-slate-800/60 p-6 sm:p-8">
        <div className="text-center">
          <p className="text-sm text-slate-400 mb-1">Session code</p>
          <p className="text-4xl font-mono font-bold tracking-widest text-slate-100">
            {session.pairCodeFormatted}
          </p>
        </div>

        {/* QR code */}
        {session.qrDataUrl && (
          <div className="rounded-xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={session.qrDataUrl}
              alt={`QR code to join session ${session.pairCodeFormatted}`}
              width={200}
              height={200}
              className="block"
            />
          </div>
        )}

        {/* Instructions */}
        <div className="text-center space-y-1">
          <p className="text-sm text-slate-300">
            Scan the QR code on your phone, or visit:
          </p>
          <p className="text-xs font-mono text-primary break-all">
            onlinecopypaste.net/join/{session.pairCode}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button
            variant="secondary"
            size="md"
            onClick={() => void handleCopyLink()}
            className="flex-1"
          >
            {copied ? '✓ Copied!' : '🔗 Copy Link'}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleGoToWorkspace}
            className="flex-1"
          >
            Open Workspace →
          </Button>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Waiting for your phone to connect… Once paired, tap "Open Workspace".
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Initial state: duration selector + start button
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-slate-700 bg-slate-800/60 p-6 sm:p-8">
      {/* Duration selector */}
      <fieldset>
        <legend className="text-sm font-medium text-slate-300 mb-3">
          Session duration
        </legend>
        <div className="flex gap-2" role="radiogroup">
          {DURATIONS.map(({ value, label }) => (
            <label
              key={value}
              className={[
                'flex-1 flex items-center justify-center rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors',
                duration === value
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300',
              ].join(' ')}
            >
              <input
                type="radio"
                name="duration"
                value={value}
                checked={duration === value}
                onChange={() => setDuration(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Error */}
      {error && (
        <p className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {/* Start button */}
      <Button
        variant="primary"
        size="lg"
        loading={isLoading}
        onClick={() => void handleStart()}
        className="w-full"
      >
        ⚡ Start Free Session
      </Button>

      <p className="text-xs text-slate-500 text-center">
        No account required. Session expires automatically after {duration === 60 ? '1 hour' : `${duration} min`}.
      </p>
    </div>
  );
}
