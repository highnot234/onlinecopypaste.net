import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy — OnlineCopyPaste.net',
  description:
    'Privacy Policy for OnlineCopyPaste.net: what data is collected, how sessions are handled, cookie usage, and data retention.',
  openGraph: {
    title: 'Privacy Policy — OnlineCopyPaste.net',
    url: 'https://onlinecopypaste.net/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main>
        <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-500 mb-10">Last updated: {new Date().getFullYear()}</p>

          <div className="prose prose-invert prose-slate max-w-none space-y-8 text-sm text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3">1. What data we collect</h2>
              <p>
                OnlineCopyPaste does not collect personally identifiable information. We do not
                require an account, email address, phone number, or name to use the service.
              </p>
              <p className="mt-2">
                When you create a session, the following temporary data is held in server memory:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
                <li>Your IP address (used for rate limiting and session creation)</li>
                <li>Session ID, pair code, and expiry time</li>
                <li>A hashed (SHA-256) copy of the session JWT — never the raw token</li>
                <li>WebRTC SDP messages during the connection handshake</li>
              </ul>
              <p className="mt-2 text-slate-400">
                This data is held in memory only. It is deleted when the session expires (10–60 minutes),
                when you click "Destroy Session", or when the server restarts. It is never written to
                a database, log file, or persistent storage.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3">2. File and content transfers</h2>
              <p>
                Files, text, code, images, and links you transfer through the DataChannel are transferred
                peer-to-peer using WebRTC. The signaling server facilitates the initial connection
                but does not receive, store, or log transfer content.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3">3. Cookies and local storage</h2>
              <p>
                OnlineCopyPaste uses <strong className="text-slate-200">sessionStorage</strong> (cleared
                when the browser tab closes) to store the active session credentials locally.
                We do not use tracking cookies or cross-site cookies.
              </p>
              <p className="mt-2 text-slate-400">
                If Google AdSense is configured on this instance, AdSense may place advertising
                cookies on your browser. You can control these via your browser settings or
                Google&apos;s ad settings. See our{' '}
                <a href="/cookies" className="text-primary hover:underline">Cookie Policy</a> for details.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3">4. Analytics</h2>
              <p className="text-slate-400">
                If Google Analytics 4 (GA4) is configured on this instance, aggregated usage data
                (page views, session counts) may be collected. IP addresses are anonymized.
                No personal identifiers are sent to GA4.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3">5. Data retention</h2>
              <p className="text-slate-400">
                All session data is held in memory and deleted on session expiry or destruction.
                We have no long-term data store associated with sessions or transfers.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3">6. Third-party services</h2>
              <p className="text-slate-400">
                We may use the following third-party services: Google AdSense (advertising),
                Google Analytics 4 (usage analytics), and public STUN servers (WebRTC connection).
                Each has its own privacy policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3">7. Contact</h2>
              <p className="text-slate-400">
                Privacy questions: support@onlinecopypaste.net
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
