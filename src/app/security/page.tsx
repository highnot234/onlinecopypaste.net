import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Security & Privacy — OnlineCopyPaste.net',
  description:
    'How OnlineCopyPaste protects your data: WebRTC DTLS encryption, what the signaling server sees (and does not store), session auto-expiry, and destroy session guarantees.',
  openGraph: {
    title: 'Security & Privacy — OnlineCopyPaste.net',
    description: 'Technical details on our security model, encryption, and data handling.',
    url: 'https://onlinecopypaste.net/security',
  },
};

const FACTS = [
  {
    icon: '🔐',
    title: 'WebRTC DTLS encryption',
    desc: 'All data transferred via WebRTC DataChannels is encrypted using DTLS (Datagram Transport Layer Security), the IETF standard for secure datagram communication. This is enforced by the browser — we cannot turn it off.',
    accurate: true,
  },
  {
    icon: '📡',
    title: 'What the signaling server sees',
    desc: 'The signaling server handles: (1) Session creation requests — your IP address and requested session duration. (2) WebSocket messages for SDP offer/answer and ICE candidates — these contain network metadata but NOT file content. (3) Session metadata in memory — session ID, pair code, expiry time.',
    accurate: true,
  },
  {
    icon: '🚫',
    title: 'What the signaling server does NOT see',
    desc: 'File content, text, code, images, notes, and links you transfer through the DataChannel — once the peer-to-peer connection is established, the signaling server is completely out of the loop. It cannot read your transfers.',
    accurate: true,
  },
  {
    icon: '⏱️',
    title: 'Session auto-expiry',
    desc: 'Sessions expire after 10, 30, or 60 minutes (your choice). On expiry, the in-memory session record is deleted from the server. No transfer history or content is retained.',
    accurate: true,
  },
  {
    icon: '🔥',
    title: 'Destroy Session',
    desc: 'Clicking "Destroy Session" immediately: disconnects all peers, deletes the in-memory session record, and invalidates the session token so it cannot be reused. SessionStorage on the browser is also cleared.',
    accurate: true,
  },
  {
    icon: '💾',
    title: 'No persistent storage',
    desc: 'No database, no S3 bucket, no logs of what was transferred. The server uses an in-memory store only. Process restart or scheduled cleanup removes all session data.',
    accurate: true,
  },
];

const LIMITS = [
  'If an attacker controls your network and intercepts the initial WebSocket connection before TLS is established, they could potentially interfere with the signaling. Always use HTTPS (the live service does).',
  'TURN relay servers (used as fallback when direct P2P is blocked by NAT) forward encrypted packets. We use standard public STUN servers and optional TURN. The TURN server sees packet metadata but not plaintext content (due to DTLS).',
  'We do not provide a formal security audit. If you are handling highly sensitive data, use a dedicated encrypted solution.',
  'Browser session storage is not a secure vault. On a compromised public computer, malware could read sessionStorage. Always destroy the session when done on a shared computer.',
];

export default function SecurityPage() {
  return (
    <>
      <Header />
      <main>
        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 leading-tight">
              Security & Privacy
            </h1>
            <p className="mt-5 text-lg text-slate-400">
              What we do to protect your data — and what our limitations are.
              We believe in honest, accurate security claims.
            </p>
          </div>
        </section>

        <section className="py-10">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="space-y-5">
              {FACTS.map((fact) => (
                <div key={fact.title} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">{fact.icon}</span>
                    <div>
                      <h2 className="font-semibold text-slate-100">{fact.title}</h2>
                      <p className="mt-2 text-sm text-slate-400 leading-relaxed">{fact.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 bg-slate-900/50">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-xl font-bold text-slate-100 mb-5">
              Limitations — what we cannot guarantee
            </h2>
            <ul className="space-y-3">
              {LIMITS.map((limit, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-400">
                  <span className="text-yellow-400 shrink-0">⚠</span>
                  {limit}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="py-8 text-center">
          <Link href="/how-it-works" className="text-sm text-primary hover:underline">
            Read the full technical explanation →
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
