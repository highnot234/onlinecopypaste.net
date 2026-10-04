'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ConnectionStatus from './ConnectionStatus';
import SessionTimer from '@/components/session/SessionTimer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HeaderProps {
  sessionExpiresAt?: Date;
}

// ---------------------------------------------------------------------------
// Nav links
// ---------------------------------------------------------------------------

const NAV_LINKS = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/lab-mode', label: 'Lab Mode' },
  { href: '/security', label: 'Security' },
  { href: '/faq', label: 'FAQ' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Sticky site header with:
 * - Logo (text + lightning bolt emoji)
 * - Navigation links (desktop) / hamburger (mobile)
 * - ConnectionStatus indicator
 * - SessionTimer (if sessionExpiresAt provided)
 * - CTA button 'Start Session'
 */
export default function Header({ sessionExpiresAt }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-slate-100 hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          <span aria-hidden="true">⚡</span>
          <span>OnlineCopyPaste</span>
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-6"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-slate-400 hover:text-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Session timer (shown when session active) */}
          {sessionExpiresAt && (
            <SessionTimer
              expiresAt={sessionExpiresAt}
              onExpired={() => {
                // Redirect to home on expiry
                window.location.href = '/';
              }}
            />
          )}

          <ConnectionStatus />

          {/* CTA */}
          <Link
            href="/"
            className="hidden sm:inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            Start Session
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex md:hidden items-center justify-center rounded p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav
          id="mobile-nav"
          aria-label="Mobile navigation"
          className="border-t border-slate-800 bg-slate-900 md:hidden"
        >
          <ul className="flex flex-col px-4 py-3 gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="block rounded bg-primary px-3 py-2 text-center text-sm font-medium text-white hover:bg-indigo-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary mt-2"
              >
                Start Session
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
