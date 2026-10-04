import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Contact — OnlineCopyPaste.net',
  description: 'Contact OnlineCopyPaste: email support, GitHub issues, and more.',
  openGraph: {
    title: 'Contact — OnlineCopyPaste.net',
    url: 'https://onlinecopypaste.net/contact',
  },
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main>
        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-xl px-4 sm:px-6">
            <h1 className="text-4xl font-bold text-slate-100 mb-4">Contact</h1>
            <p className="text-slate-400 mb-10">
              No account needed to use OnlineCopyPaste — and the same is true here.
              Reach out by email or open an issue on GitHub.
            </p>

            <div className="space-y-5">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="font-semibold text-slate-100 mb-2">📧 Email</h2>
                <a
                  href="mailto:support@onlinecopypaste.net"
                  className="text-primary hover:underline text-sm"
                >
                  support@onlinecopypaste.net
                </a>
                <p className="mt-1 text-xs text-slate-500">
                  For bug reports, feature requests, and general questions.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="font-semibold text-slate-100 mb-2">🐛 GitHub Issues</h2>
                <a
                  href="https://github.com/onlinecopypaste/onlinecopypaste.net/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  github.com/onlinecopypaste/onlinecopypaste.net
                </a>
                <p className="mt-1 text-xs text-slate-500">
                  Open an issue for bugs or feature requests. Pull requests welcome.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="font-semibold text-slate-100 mb-2">🔒 Security vulnerabilities</h2>
                <a
                  href="mailto:security@onlinecopypaste.net"
                  className="text-primary hover:underline text-sm"
                >
                  security@onlinecopypaste.net
                </a>
                <p className="mt-1 text-xs text-slate-500">
                  Please disclose security vulnerabilities privately via email before filing a
                  public issue.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
