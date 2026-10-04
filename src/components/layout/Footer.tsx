import React from 'react';
import Link from 'next/link';

const LINKS_PRODUCT = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/lab-mode', label: 'Lab Mode' },
  { href: '/phone-to-pc', label: 'Phone to PC' },
  { href: '/online-clipboard', label: 'Online Clipboard' },
  { href: '/file-transfer', label: 'File Transfer' },
  { href: '/code-transfer', label: 'Code Transfer' },
];

const LINKS_SUPPORT = [
  { href: '/faq', label: 'FAQ' },
  { href: '/security', label: 'Security' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

const LINKS_LEGAL = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/cookies', label: 'Cookies' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Site footer (server component).
 * Includes product, support, and legal links, copyright, and tagline.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-900 mt-16">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <p className="text-base font-bold text-slate-100">
              ⚡ OnlineCopyPaste
            </p>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              A fast, private, temporary workspace for moving content between
              your phone and computer — no account required.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Product
            </h3>
            <ul className="mt-3 space-y-2">
              {LINKS_PRODUCT.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Support
            </h3>
            <ul className="mt-3 space-y-2">
              {LINKS_SUPPORT.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Legal
            </h3>
            <ul className="mt-3 space-y-2">
              {LINKS_LEGAL.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          {/* suppressHydrationWarning is intentional: new Date().getFullYear() is
              a render-time call that is identical on server and client within the
              same calendar year, but React flags any render-time Date call. We
              suppress only this single span, not the whole component. */}
          <p>© <span suppressHydrationWarning>{year}</span> OnlineCopyPaste.net — All rights reserved.</p>
          <p>
            No account. No tracking. No permanent storage.
          </p>
        </div>
      </div>
    </footer>
  );
}
