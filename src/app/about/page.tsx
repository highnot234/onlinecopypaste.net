import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'About — OnlineCopyPaste.net',
  description:
    'The story behind OnlineCopyPaste: built for students using college lab computers, with a mission to make device-to-device transfer private and account-free.',
  openGraph: {
    title: 'About — OnlineCopyPaste.net',
    url: 'https://onlinecopypaste.net/about',
  },
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <h1 className="text-4xl font-bold text-slate-100 mb-6">About OnlineCopyPaste</h1>

            <div className="space-y-6 text-slate-300 leading-relaxed">
              <div>
                <h2 className="text-xl font-semibold text-slate-100 mb-2">The problem</h2>
                <p className="text-slate-400">
                  Imagine you are a college student sitting at a lab computer. You need to
                  transfer your assignment from your phone to this PC. Your options? Log into
                  WhatsApp and leave it open. Log into Google Drive and hope you remember to
                  sign out. Use a USB drive you might not have. Email yourself and hope the
                  attachment arrives in time.
                </p>
                <p className="mt-3 text-slate-400">
                  Each of these options involves logging a personal account into a public machine
                  — something that should make everyone uncomfortable. It&apos;s a privacy risk
                  students take every day because there&apos;s no better alternative.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-100 mb-2">The solution</h2>
                <p className="text-slate-400">
                  OnlineCopyPaste is built for exactly this scenario. Open the website, scan a QR code,
                  and transfer whatever you need — text, code, files, images. When you&apos;re done,
                  destroy the session and nothing remains on the public computer. No account, no login,
                  no trace.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-100 mb-2">Mission</h2>
                <p className="text-slate-400">
                  To make device-to-device content transfer private, account-free, and fast —
                  especially for students, public computer users, and anyone who values their
                  digital privacy on shared machines.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-100 mb-2">Open source</h2>
                <p className="text-slate-400">
                  OnlineCopyPaste is an open-source project. Contributions, bug reports, and
                  feature requests are welcome via GitHub.
                </p>
              </div>
            </div>

            <div className="mt-10 flex gap-4">
              <Link
                href="/"
                className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                Try It Now
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
