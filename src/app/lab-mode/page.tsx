import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AdSlot from '@/components/ads/AdSlot';
import Badge from '@/components/ui/Badge';

export const metadata: Metadata = {
  title: 'Lab Mode — Secure Session for College & Public Computers',
  description:
    'Lab Mode is designed for college computer labs and public computers. No login, temporary session, QR pairing, and auto-expiry. Destroy the session when done.',
  openGraph: {
    title: 'Lab Mode — Secure Session for College & Public Computers',
    description:
      'No login. Temporary session. QR pairing. Auto-expiry. Designed for college labs and public computers.',
    url: 'https://onlinecopypaste.net/lab-mode',
  },
};

const SessionCreator = dynamic(
  () => import('@/components/session/SessionCreator'),
  { ssr: false, loading: () => <div className="h-48 rounded-2xl bg-slate-800/60 animate-pulse" /> },
);

const LAB_FEATURES = [
  { icon: '🚫', text: 'No login required — not even a Google account' },
  { icon: '⏱️', text: 'Session expires automatically — nothing lingers' },
  { icon: '📱', text: 'QR code pairing — phone connects in seconds' },
  { icon: '🔢', text: '6-digit code fallback — no camera required' },
  { icon: '🔥', text: '"Destroy Session" wipes all data instantly' },
  { icon: '🔒', text: 'WebRTC P2P — content not stored on server' },
  { icon: '📦', text: 'No app to install on the lab computer' },
  { icon: '🧹', text: 'No personal account remains after the session' },
];

export default function LabModePage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
            <div className="mb-4">
              <Badge variant="info">Lab Mode</Badge>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 leading-tight">
              Safe, temporary sessions for{' '}
              <span className="text-primary">shared computers</span>
            </h1>
            <p className="mt-5 text-lg text-slate-400">
              Designed for college labs, library PCs, and any shared computer where
              logging into personal accounts is a privacy risk.
            </p>
          </div>
        </section>

        {/* Checklist */}
        <section className="py-10 bg-slate-900/50">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <h2 className="text-xl font-semibold text-slate-100 mb-6 text-center">
              Lab-safe by design
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LAB_FEATURES.map((f) => (
                <li
                  key={f.text}
                  className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3"
                >
                  <span className="text-xl shrink-0" aria-hidden="true">{f.icon}</span>
                  <span className="text-sm text-slate-300">{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Session creator */}
        <section className="py-14">
          <div className="mx-auto max-w-md px-4 sm:px-6">
            <h2 className="text-xl font-bold text-center text-slate-100 mb-6">
              Start a Lab Session
            </h2>
            <SessionCreator />
          </div>
        </section>

        {/* Ad */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6 mb-10">
          <AdSlot slot="lab-mode" />
        </div>

        {/* Privacy promise */}
        <section className="py-10 bg-slate-900/50">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 text-center">
            <h2 className="text-xl font-semibold text-slate-100 mb-3">
              Privacy promise
            </h2>
            <p className="text-sm text-slate-400">
              File content transferred via WebRTC is peer-to-peer and not stored on
              our servers. The signaling server only facilitates the initial handshake.
              Session metadata (pair code, expiry) is held in memory only and deleted
              when the session expires or is destroyed.
            </p>
            <div className="mt-5">
              <Link href="/security" className="text-sm text-primary hover:underline">
                Full security details →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
