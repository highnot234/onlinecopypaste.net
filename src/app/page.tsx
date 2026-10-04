import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Online Copy Paste — Transfer Files, Text & Code Between Devices',
  description:
    'Move text, code, files, images, and links between your phone and computer instantly. No account, no app, no USB. Scan a QR code and go.',
  openGraph: {
    title: 'Online Copy Paste — Transfer Files, Text & Code Between Devices',
    description:
      'A fast, private, temporary workspace for moving content between your phone and computer without requiring an account.',
    url: 'https://onlinecopypaste.net',
    type: 'website',
  },
};

// ---------------------------------------------------------------------------
// Dynamic imports — SessionCreator uses sessionStorage on mount
// ---------------------------------------------------------------------------

const SessionCreator = dynamic(
  () => import('@/components/session/SessionCreator'),
  { ssr: false, loading: () => <div className="h-48 rounded-2xl bg-slate-800/60 animate-pulse" /> },
);

// ---------------------------------------------------------------------------
// Static content
// ---------------------------------------------------------------------------

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Open on PC',
    desc: 'Visit onlinecopypaste.net on the lab or public computer. Click "Start Session".',
    icon: '🖥️',
  },
  {
    step: '2',
    title: 'Scan or Enter Code',
    desc: 'Scan the QR code with your phone, or type the 6-digit code at onlinecopypaste.net/join.',
    icon: '📱',
  },
  {
    step: '3',
    title: 'Transfer & Destroy',
    desc: 'Send files, text, or code in both directions. Hit "Destroy Session" when done.',
    icon: '🔥',
  },
];

const FEATURES = [
  { icon: '🔒', title: 'No Account Required', desc: 'Nothing to sign up for. Just open, connect, and transfer.' },
  { icon: '🔐', title: 'End-to-End Encrypted', desc: 'WebRTC DataChannel uses DTLS encryption for all transfers.' },
  { icon: '⏱️', title: 'Auto-Expiry', desc: 'Sessions self-destruct after 10, 30, or 60 minutes.' },
  { icon: '🌐', title: 'Works Everywhere', desc: 'Any browser, any device. No app install needed.' },
  { icon: '📲', title: 'Install as PWA', desc: 'Add to home screen for faster access from your phone.' },
  { icon: '💻', title: 'Great for Developers', desc: 'Syntax-highlighted code transfer, JSON viewer, URL sharing.' },
];

const USE_CASES = [
  { icon: '🎓', title: 'Students & College Labs', desc: 'Transfer your assignment, code, or notes to the lab PC without logging into personal accounts.' },
  { icon: '🏢', title: 'Shared / Public Computers', desc: 'Library, cyber café, or office hotdesks — stay private on shared machines.' },
  { icon: '👨‍💻', title: 'Developers', desc: 'Quickly move code snippets, environment variables, or SSH keys between devices during a session.' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
            <div className="mb-4 inline-flex items-center rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/30">
              No account · No app · No USB
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-100 leading-tight">
              Transfer anything between your{' '}
              <span className="text-primary">phone and PC</span>
              {' '}— instantly
            </h1>
            <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
              A fast, private, temporary workspace for students, lab computers, and
              anyone who doesn&apos;t want to log into personal accounts on a shared machine.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="#session-creator"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-base font-semibold text-white hover:bg-indigo-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                ⚡ Start Free Session
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-6 py-3 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                How It Works
              </Link>
            </div>
          </div>
        </section>

        {/* Ad slot — below hero */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6 mb-8">
          <AdSlot slot="homepage-hero" className="w-full" />
        </div>

        {/* How it works */}
        <section className="py-12 bg-slate-900/50">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-center text-slate-100 mb-10">
              How it works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {HOW_IT_WORKS.map((step) => (
                <div key={step.step} className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-3xl ring-1 ring-primary/30">
                    {step.icon}
                  </div>
                  <h3 className="text-base font-semibold text-slate-100">
                    <span className="text-primary mr-1">{step.step}.</span>
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Session creator */}
        <section id="session-creator" className="py-16">
          <div className="mx-auto max-w-md px-4 sm:px-6">
            <h2 className="text-xl font-bold text-center text-slate-100 mb-6">
              Start a Session
            </h2>
            <SessionCreator />
          </div>
        </section>

        {/* Features grid */}
        <section className="py-12 bg-slate-900/50">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-center text-slate-100 mb-10">
              Built for real-world use
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="text-3xl mb-3">{f.icon}</div>
                  <h3 className="text-sm font-semibold text-slate-100 mb-1">{f.title}</h3>
                  <p className="text-xs text-slate-400">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="py-12">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-center text-slate-100 mb-10">
              Who uses OnlineCopyPaste?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {USE_CASES.map((uc) => (
                <div
                  key={uc.title}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="text-3xl mb-3">{uc.icon}</div>
                  <h3 className="text-base font-semibold text-slate-100 mb-2">{uc.title}</h3>
                  <p className="text-sm text-slate-400">{uc.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy callout */}
        <section className="py-12 bg-slate-900/50">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 text-center">
            <h2 className="text-xl font-bold text-slate-100 mb-3">
              Your privacy is the product
            </h2>
            <p className="text-sm text-slate-400">
              Sessions are temporary. No personal information is collected.
              Transfer data passes peer-to-peer via WebRTC — the signaling server
              only establishes the connection, not the content.
              Destroy the session when you&apos;re done and nothing remains.
            </p>
            <div className="mt-6">
              <Link
                href="/security"
                className="text-sm text-primary hover:underline"
              >
                Read our security & privacy approach →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
