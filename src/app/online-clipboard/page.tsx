import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AdSlot from '@/components/ads/AdSlot';

export const metadata: Metadata = {
  title: 'Online Clipboard Between Devices — No Account Required',
  description:
    'A shared online clipboard that syncs text, code, and links between your phone and computer instantly. No login, no app. Just open and paste.',
  openGraph: {
    title: 'Online Clipboard Between Devices — No Account Required',
    description: 'Sync text, code, and links between devices instantly. No account, no app.',
    url: 'https://onlinecopypaste.net/online-clipboard',
  },
};

const USE_CASES = [
  { icon: '🔑', title: 'Passwords & OTPs', desc: 'Copy a one-time code from your phone to the PC without typing it.' },
  { icon: '🔗', title: 'Links & URLs', desc: 'Open a link from your phone on the computer instantly.' },
  { icon: '💻', title: 'Code Snippets', desc: 'Transfer a function or config value from your phone to the editor.' },
  { icon: '📝', title: 'Notes', desc: 'Jot something on your phone and paste it into a document on the PC.' },
];

export default function OnlineClipboardPage() {
  return (
    <>
      <Header />
      <main>
        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 leading-tight">
              Online clipboard{' '}
              <span className="text-primary">between devices</span>
            </h1>
            <p className="mt-5 text-lg text-slate-400">
              Copy something on your phone, paste it on the computer — without logging
              into any account. Works across different browsers and operating systems.
            </p>
            <div className="mt-8">
              <Link
                href="/#session-creator"
                className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-base font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                ⚡ Start Clipboard Session
              </Link>
            </div>
          </div>
        </section>

        <AdSlot slot="clipboard-top" className="mx-auto max-w-4xl px-4 sm:px-6 mb-8" />

        <section className="py-12 bg-slate-900/50">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-8 text-center">
              What can you share?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {USE_CASES.map((uc) => (
                <div
                  key={uc.title}
                  className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5"
                >
                  <span className="text-3xl shrink-0">{uc.icon}</span>
                  <div>
                    <h3 className="font-semibold text-slate-100">{uc.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{uc.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 text-center">
            <h2 className="text-xl font-bold text-slate-100 mb-4">
              How is this different from other clipboard tools?
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Most cross-device clipboard tools require you to install an app, create an account,
              or sync through a cloud service. OnlineCopyPaste requires nothing. Open the website,
              scan a QR code, and start sharing — the session destroys itself when you&apos;re done.
              It&apos;s designed especially for public computers where signing into anything is a risk.
            </p>
          </div>
        </section>

        <div className="py-8 text-center">
          <Link
            href="/#session-creator"
            className="inline-flex items-center rounded-lg bg-primary px-8 py-3 text-base font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Try It Free
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
