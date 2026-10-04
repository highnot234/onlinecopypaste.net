'use client';

import React, { Suspense } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import Workspace from '@/components/workspace/Workspace';

// ---------------------------------------------------------------------------
// Inner component — reads role from searchParams only
// ---------------------------------------------------------------------------

function WorkspacePage() {
  return (
    <ToastProvider>
      <Workspace />
    </ToastProvider>
  );
}

// ---------------------------------------------------------------------------
// Page export — wrapped in Suspense (required for useSearchParams in App Router)
// ---------------------------------------------------------------------------

export default function AppPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0f172a]">
          <div className="text-center">
            <p className="text-3xl mb-3">⚡</p>
            <p className="text-slate-400 text-sm">Loading workspace…</p>
          </div>
        </div>
      }
    >
      <WorkspacePage />
    </Suspense>
  );
}
