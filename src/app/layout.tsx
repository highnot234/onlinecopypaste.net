import type { Metadata, Viewport } from 'next';
import './globals.css';

/**
 * WHY next/script IS NOT USED IN THIS FILE:
 *
 * next/script (Next.js 14) imports next/dist/client/head-manager.js at the
 * module level. When layout.tsx imports next/script — even conditionally —
 * webpack includes head-manager.js in the layout chunk. head-manager.js runs
 * on the client during hydration, finds no Pages Router <Head> title element
 * (App Router uses the Metadata API instead), and executes:
 *
 *   document.title = ""    ← clears the server-rendered title
 *
 * React then detects a mismatch between the server HTML title and the now-empty
 * DOM title node, throwing hydration error #418.
 *
 * Fix: use plain HTML <script> elements for third-party scripts. These are
 * server-rendered as static HTML and do NOT import head-manager.js. Behaviour
 * in production is identical — the scripts load after the page with async/defer.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const ADSENSE_ID = process.env.NEXT_PUBLIC_ADSENSE_ID;

export const metadata: Metadata = {
  title: {
    default: 'Online Copy Paste — Transfer Files, Text & Code Between Devices',
    template: '%s | Online Copy Paste',
  },
  description:
    'Move text, code, files, images and links between your phone and computer instantly — no account, no app, no USB. Just scan a QR code and go.',
  keywords: [
    'online clipboard',
    'transfer files between phone and pc',
    'copy paste between devices',
    'phone to computer transfer',
    'no login file sharing',
    'qr code file transfer',
    'college lab computer',
    'temporary clipboard',
    'cross device clipboard',
  ],
  metadataBase: new URL('https://onlinecopypaste.net'),
  alternates: { canonical: 'https://onlinecopypaste.net' },
  openGraph: {
    type: 'website',
    url: 'https://onlinecopypaste.net',
    siteName: 'Online Copy Paste',
    title: 'Online Copy Paste — Transfer Files, Text & Code Between Devices',
    description:
      'Move text, code, files, images and links between your phone and computer instantly — no account, no app, no USB.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Online Copy Paste' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Online Copy Paste — Transfer Files & Text Between Devices',
    description:
      'No account. No app. Scan a QR code and instantly transfer files, text, and code between devices.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#6366f1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-sans bg-[#0f172a] text-slate-100">
        {children}

        {/* Google AdSense — plain <script> avoids head-manager.js import */}
        {ADSENSE_ID && (
          // eslint-disable-next-line @next/next/no-sync-scripts
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`}
            crossOrigin="anonymous"
          />
        )}

        {/* Google Analytics — plain <script> tags, no next/script dependency */}
        {GA_ID && (
          <>
            {/* eslint-disable-next-line @next/next/no-sync-scripts */}
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            />
            <script
              id="ga-init"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}');
                `,
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}
