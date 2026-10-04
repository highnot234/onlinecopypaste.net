import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'FAQ — Online Copy Paste',
  description:
    'Frequently asked questions about OnlineCopyPaste: how it works, security, supported file types, file size limits, offline mode, and what happens when a session expires.',
  openGraph: {
    title: 'FAQ — Online Copy Paste',
    description: 'Answers to the most common questions about OnlineCopyPaste.',
    url: 'https://onlinecopypaste.net/faq',
  },
  other: {
    // Schema.org FAQ is added via JSON-LD below in the page body
  },
};

const FAQS = [
  { q: 'How does OnlineCopyPaste work?', a: 'Open the site on a PC, click "Start Session", and a QR code appears. Scan it on your phone (or enter the 6-digit code at onlinecopypaste.net/join). Once connected, you can transfer text, code, files, links, and images between the two devices. When done, click "Destroy Session" to wipe everything.' },
  { q: 'Do I need to create an account?', a: 'No account, no email, no phone number, no password. Sessions are anonymous and temporary.' },
  { q: 'Is my data secure?', a: 'File and text content is transferred via WebRTC DataChannels, which use DTLS encryption (similar to TLS). The signaling server only brokers the connection — it never receives file content.' },
  { q: 'What file types are supported?', a: 'Images (JPG, PNG, GIF, WebP, SVG), PDFs, ZIP/TAR/GZ archives, text and code files (JS, TS, PY, CSS, HTML, JSON, TXT), Word/Excel/PowerPoint documents, and MP4 videos. The default limit is 100 MB per file.' },
  { q: 'What is the maximum file size?', a: 'The default maximum is 100 MB per file. If you need to transfer larger files, consider splitting or compressing them first.' },
  { q: 'Does it work without internet?', a: 'If both devices are on the same Wi-Fi or LAN, WebRTC can often establish a local peer connection without going through the internet. However, the initial session pairing still requires the signaling server to be reachable. Fully offline (no network at all) transfer is not possible in a browser — no communication path means no transfer.' },
  { q: 'Does the file go through your server?', a: 'No. After the initial WebRTC handshake (which only involves session metadata and network addresses), file content goes directly between your devices. The signaling server never sees or stores file content.' },
  { q: 'What happens when the session expires?', a: 'The server deletes the in-memory session record. The pair code and session ID are invalidated. Any pending transfers are interrupted. You will be redirected to the homepage.' },
  { q: 'Can I use it from mobile only?', a: 'Yes. You can use OnlineCopyPaste from any two browser tabs on the same or different devices. However, the primary use case is phone ↔ computer. Two phones work too.' },
  { q: 'Is it safe to use on a public computer?', a: 'Yes — that is the primary design goal. No login means no account is left open on the public machine. Always click "Destroy Session" before leaving to remove all session data from the browser.' },
  { q: 'Can someone else join my session?', a: 'Sessions require a randomly generated 6-digit pair code. While technically guessable with brute force, the rate limiter on the API prevents rapid guessing. Sessions also expire quickly (10–60 minutes). Do not share your pair code publicly.' },
  { q: 'Can I transfer multiple files at once?', a: 'Yes. The Files tab supports selecting multiple files at once and shows individual progress bars for each transfer.' },
  { q: 'Does OnlineCopyPaste work on iOS?', a: 'Yes. The web app works on Safari on iPhone and iPad. WebRTC DataChannels are supported in Safari 15+. For older devices, functionality may be limited.' },
  { q: 'Can I install it as an app?', a: 'Yes. OnlineCopyPaste supports PWA (Progressive Web App) installation. On Android, your browser will offer "Add to Home Screen". On iOS, use Safari\'s Share button → "Add to Home Screen".' },
  { q: 'How is this different from AirDrop or Nearby Share?', a: 'AirDrop requires Apple devices. Nearby Share requires Android. OnlineCopyPaste works across any combination of devices and operating systems — Android, iPhone, Windows, macOS, Linux — as long as they have a modern browser.' },
];

// JSON-LD for FAQ schema markup
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.a,
    },
  })),
};

export default function FaqPage() {
  return (
    <>
      <Header />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
            <h1 className="text-4xl font-bold text-slate-100">
              Frequently Asked Questions
            </h1>
            <p className="mt-4 text-slate-400">
              Everything you need to know about OnlineCopyPaste.
            </p>
          </div>
        </section>

        <section className="pb-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <dl className="space-y-4">
              {FAQS.map((item, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-slate-800 bg-slate-900"
                >
                  <summary className="flex cursor-pointer items-start justify-between gap-4 px-5 py-4 text-sm font-semibold text-slate-100 list-none">
                    <dt>{item.q}</dt>
                    <span
                      className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform"
                      aria-hidden="true"
                    >
                      ▾
                    </span>
                  </summary>
                  <dd className="px-5 pb-4 text-sm text-slate-400 leading-relaxed">
                    {item.a}
                  </dd>
                </details>
              ))}
            </dl>

            <div className="mt-10 text-center">
              <p className="text-sm text-slate-500">
                Still have questions?{' '}
                <Link href="/contact" className="text-primary hover:underline">
                  Contact us
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
