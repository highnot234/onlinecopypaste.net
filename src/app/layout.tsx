import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

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
      <head>
        {/* Google AdSense */}
        {ADSENSE_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body className="min-h-screen font-sans bg-[#0f172a] text-slate-100">
        {children}

        {/* Google Analytics */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
