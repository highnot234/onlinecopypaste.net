'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import type { Metadata } from 'next';
import { ToastProvider } from '@/components/ui/Toast';
import SessionJoiner from '@/components/session/SessionJoiner';
import Header from '@/components/layout/Header';

// Note: metadata export is not supported in 'use client' pages.
// SEO meta for /join/* is intentionally noindex (dynamic session page).

// ---------------------------------------------------------------------------
// Inner component
// ---------------------------------------------------------------------------

function JoinPageInner() {
  const params = useParams<{ code: string }>();
  const code = params?.code ?? '';

  return (
    <div className="flex min-h-screen flex-col bg-[#0f172a]">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-100">
              {code ? `Joining session ${code.slice(0, 3)} ${code.slice(3)}` : 'Join a Session'}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Enter the 6-digit code shown on the PC screen
            </p>
          </div>
          <ToastProvider>
            <SessionJoiner initialCode={code} />
          </ToastProvider>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0f172a]">
          <p className="text-slate-400 text-sm">Loading…</p>
        </div>
      }
    >
      <JoinPageInner />
    </Suspense>
  );
}
