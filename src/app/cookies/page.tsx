import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Cookie Policy — OnlineCopyPaste.net',
  description: 'Cookie Policy for OnlineCopyPaste.net: what cookies are used, which are functional-only, and how to control them.',
  openGraph: {
    title: 'Cookie Policy — OnlineCopyPaste.net',
    url: 'https://onlinecopypaste.net/cookies',
  },
};

export default function CookiesPage() {
  return (
    <>
      <Header />
      <main>
        <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Cookie Policy</h1>
          <p className="text-sm text-slate-500 mb-10">Last updated: {new Date().getFullYear()}</p>

          <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3">1. Cookies we use</h2>
              <div className="overflow-x-auto rounded-xl border border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800">
                      <th className="px-4 py-3 text-left text-slate-300 font-semibold">Cookie / Storage</th>
                      <th className="px-4 py-3 text-left text-slate-300 font-semibold">Type</th>
                      <th className="px-4 py-3 text-left text-slate-300 font-semibold">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-400">
                    <tr className="border-b border-slate-800">
                      <td className="px-4 py-3 font-mono">ocp_session (sessionStorage)</td>
                      <td className="px-4 py-3">Functional</td>
                      <td className="px-4 py-3">Stores the active session token in the browser tab. Cleared automatically when the tab closes.</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="px-4 py-3 font-mono">_ga, _gid</td>
                      <td className="px-4 py-3">Analytics (optional)</td>
                      <td className="px-4 py-3">Google Analytics 4 tracking, if configured. Anonymized usage statistics only. Not set if GA4 is not configured.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono">Google AdSense</td>
                      <td className="px-4 py-3">Advertising (optional)</td>
                      <td className="px-4 py-3">Google AdSense advertising cookies, if a publisher ID is configured. Not set if AdSense is not configured.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3">2. How to control cookies</h2>
              <p className="text-slate-400">
                You can control or delete cookies through your browser settings. Most browsers allow
                you to block third-party cookies while keeping functional first-party storage intact.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
                <li>Chrome: Settings → Privacy and Security → Cookies and other site data</li>
                <li>Firefox: Settings → Privacy & Security → Cookies and Site Data</li>
                <li>Safari: Settings → Safari → Privacy → Block All Cookies</li>
              </ul>
              <p className="mt-2 text-slate-400">
                Blocking sessionStorage will prevent session credentials from being stored locally,
                meaning you will need to re-pair devices if you navigate away. This does not affect
                the ability to use the service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3">3. Contact</h2>
              <p className="text-slate-400">
                Cookie questions: support@onlinecopypaste.net
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
