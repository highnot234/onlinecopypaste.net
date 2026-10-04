'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { useSession } from '@/hooks/useSession';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionJoinerProps {
  /** Pre-fill the code input (from URL param after QR scan) */
  initialCode?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a raw 6-digit string as 'XXX XXX' */
function formatDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

/** Strip all non-digits */
function digitsOnly(s: string): string {
  return s.replace(/\D/g, '').slice(0, 6);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Phone-side join UI.
 * - 6-digit code input (auto-focus, numeric keyboard)
 * - 'Join Session' button → calls useSession.joinSession(code)
 * - On success: redirects to /app?sessionId=...&role=phone
 * - QR scanner note
 */
export default function SessionJoiner({ initialCode = '' }: SessionJoinerProps) {
  const [rawCode, setRawCode] = useState<string>(digitsOnly(initialCode));
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { isLoading, error, joinSession } = useSession();

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRawCode(digitsOnly(e.target.value));
  };

  const handleJoin = async () => {
    if (rawCode.length !== 6) return;
    const result = await joinSession(rawCode);
    if (result) {
      router.push(
        `/app?sessionId=${result.sessionId}&token=${result.token}&role=phone`,
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void handleJoin();
  };

  const displayValue = formatDisplay(rawCode);

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-slate-700 bg-slate-800/60 p-6 sm:p-8 w-full max-w-sm mx-auto">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-slate-100">
          Enter session code
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Type the 6-digit code shown on the PC screen
        </p>
      </div>

      {/* Code input */}
      <div className="flex flex-col gap-2">
        <label htmlFor="pair-code" className="sr-only">
          6-digit session code
        </label>
        <input
          ref={inputRef}
          id="pair-code"
          type="tel"
          inputMode="numeric"
          pattern="[0-9 ]*"
          autoComplete="off"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="000 000"
          maxLength={7} // 6 digits + 1 space
          aria-label="6-digit session code"
          aria-describedby="code-hint"
          className={[
            'w-full rounded-xl border bg-slate-900 px-4 py-4',
            'text-center text-3xl font-mono tracking-[0.5em] text-slate-100',
            'placeholder:text-slate-600',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-800',
            error ? 'border-red-500' : 'border-slate-600',
          ].join(' ')}
        />
        <p id="code-hint" className="text-xs text-slate-500 text-center">
          The code is on the PC screen next to the QR code
        </p>
      </div>

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400 text-center"
        >
          {error}
        </p>
      )}

      {/* Join button */}
      <Button
        variant="primary"
        size="lg"
        loading={isLoading}
        disabled={rawCode.length !== 6}
        onClick={() => void handleJoin()}
        className="w-full"
      >
        Join Session →
      </Button>

      {/* QR scanner note */}
      <div className="rounded-lg bg-slate-700/40 px-4 py-3 text-center">
        <p className="text-xs text-slate-400">
          <span aria-hidden="true">📷 </span>
          Or just scan the QR code on the PC screen — it will bring you here
          automatically.
        </p>
      </div>
    </div>
  );
}
