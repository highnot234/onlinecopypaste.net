import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service — OnlineCopyPaste.net',
  description: 'Terms of Service for OnlineCopyPaste.net: acceptable use, service availability, and limitation of liability.',
  openGraph: {
    title: 'Terms of Service — OnlineCopyPaste.net',
    url: 'https://onlinecopypaste.net/terms',
  },
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main>
        <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Terms of Service</h1>
          <p className="text-sm text-slate-500 mb-10">Last updated: {new Date().getFullYear()}</p>

          <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3">1. Service description</h2>
              <p className="text-slate-400">
                OnlineCopyPaste.net provides a temporary, anonymous file and content transfer service
                between browser-based devices. Sessions are ephemeral and require no account.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3">2. Acceptable use</h2>
              <p className="text-slate-400">You agree not to use this service to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
                <li>Transfer illegal content, malware, or content that infringes third-party rights</li>
                <li>Attempt to overwhelm or disrupt the signaling server (DoS/DDoS)</li>
                <li>Circumvent rate limits or session restrictions</li>
                <li>Use automated tools to scrape or abuse the API</li>
                <li>Transfer child sexual abuse material (CSAM) or content harmful to minors</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3">3. Service availability</h2>
              <p className="text-slate-400">
                OnlineCopyPaste.net is provided &quot;as is&quot; without uptime guarantees. Sessions may expire
                or be interrupted due to server maintenance or technical failures. We are not
                responsible for incomplete transfers or lost data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3">4. Limitation of liability</h2>
              <p className="text-slate-400">
                To the maximum extent permitted by law, OnlineCopyPaste.net and its operators are
                not liable for any direct, indirect, incidental, or consequential damages arising
                from your use of the service, including loss of data or interrupted transfers.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3">5. Changes to these terms</h2>
              <p className="text-slate-400">
                We may update these Terms at any time. Continued use of the service after changes
                constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3">6. Contact</h2>
              <p className="text-slate-400">
                Terms questions: support@onlinecopypaste.net
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
