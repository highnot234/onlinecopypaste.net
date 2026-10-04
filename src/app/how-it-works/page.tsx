import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'How It Works — OnlineCopyPaste.net',
  description:
    'Learn how OnlineCopyPaste works: three connection modes (Online, Local, Offline), the WebRTC architecture, what the signaling server does and does not store, and the complete session flow.',
  openGraph: {
    title: 'How It Works — OnlineCopyPaste.net',
    description: 'The technical explanation of how session pairing and P2P transfers work.',
    url: 'https://onlinecopypaste.net/how-it-works',
  },
};

const MODES = [
  {
    label: 'MODE 1 — ONLINE',
    color: 'text-green-400',
    badge: 'bg-green-500/20 ring-green-500/30 text-green-400',
    diagram: 'Phone ⇅ Internet ⇅ Signaling Server ⇅ PC',
    desc: 'Both devices connect to the internet. The signaling server brokers the WebRTC connection. File content travels peer-to-peer after that — the server only sees session metadata, not file content.',
  },
  {
    label: 'MODE 2 — LOCAL (LAN)',
    color: 'text-yellow-400',
    badge: 'bg-yellow-500/20 ring-yellow-500/30 text-yellow-400',
    diagram: 'Phone ⇅ Wi-Fi / LAN ⇅ PC',
    desc: 'Both devices are on the same Wi-Fi or LAN. WebRTC can establish a peer connection via local network addresses (mDNS or local ICE candidates). Ideal for college labs where internet may be restricted.',
  },
  {
    label: 'MODE 3 — OFFLINE-FIRST UI',
    color: 'text-red-400',
    badge: 'bg-red-500/20 ring-red-500/30 text-red-400',
    diagram: 'App cached in browser (PWA)',
    desc: 'Once you have visited OnlineCopyPaste, the app shell is cached as a PWA (Progressive Web App). The UI loads from cache when offline. However, actual device-to-device transfer requires at least one communication path (internet, LAN, or hotspot). If no path exists, transfer is technically impossible — we say so clearly.',
  },
];

const SESSION_FLOW = [
  { title: 'PC visits onlinecopypaste.net', desc: 'A temporary session is created: unique ID, 6-digit pair code, and a QR code pointing to /join/{pairCode}.' },
  { title: 'PC connects to WebSocket signaling server', desc: 'The PC\'s browser opens a WebSocket connection and sends a "join" message with the session token and role=pc.' },
  { title: 'Phone scans QR or enters code', desc: 'Phone visits /join/{code} and the browser sends a "join" message with role=phone.' },
  { title: 'Server broadcasts "paired" to both peers', desc: 'The signaling server relays a "paired" message to both the PC and the phone. This is the only moment the server knows both peers are connected.' },
  { title: 'PC creates a WebRTC offer', desc: 'The PC generates an SDP offer (session description) and sends it to the signaling server for relay to the phone.' },
  { title: 'Phone creates an answer', desc: 'The phone responds with an SDP answer, relayed back to the PC via the signaling server.' },
  { title: 'ICE candidates exchanged', desc: 'Both peers exchange ICE candidates (network address candidates) via the signaling server, selecting the best path (LAN, STUN, or TURN).' },
  { title: 'DataChannel opens — transfers begin', desc: 'Once the RTCPeerConnection is established and the DataChannel is open, all content transfers go directly peer-to-peer. The signaling server is no longer involved.' },
  { title: 'Session destroyed', desc: 'When the user clicks "Destroy Session" or the session expires, the server deletes the session record, disconnects all peers, and any temporary data is cleared.' },
];

const FAQ = [
  { q: 'What does the signaling server actually see?', a: 'The signaling server sees: session ID, pair code, your IP address, and the SDP offer/answer messages (which contain network metadata but not file content). It never sees the files, text, or code you transfer.' },
  { q: 'Is WebRTC actually peer-to-peer?', a: 'When both peers are on the same LAN or have compatible NAT, yes — data flows directly between devices with no intermediary. In cases where NAT prevents direct connection, a TURN relay server forwards the encrypted data. Even over TURN, the content is end-to-end encrypted with DTLS.' },
  { q: 'What happens if the connection drops?', a: 'The hook retries the WebSocket connection up to 3 times with exponential backoff. If the WebRTC DataChannel closes, the connection state is displayed and the user can manually reconnect using the same session code (if the session has not expired).' },
  { q: 'Can someone intercept my transfer?', a: 'WebRTC DataChannels use DTLS (similar to TLS) for encryption. An attacker on the same network cannot read the transfer content. However, if an attacker controls the signaling server, they could attempt a man-in-the-middle attack during the SDP exchange — use only trusted instances of this service.' },
];

export default function HowItWorksPage() {
  return (
    <>
      <Header />
      <main>
        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 leading-tight">
              How it works
            </h1>
            <p className="mt-5 text-lg text-slate-400">
              Three connection modes, a minimal signaling server, and peer-to-peer
              WebRTC transfers — explained plainly.
            </p>
          </div>
        </section>

        {/* Connection modes */}
        <section className="py-10 bg-slate-900/50">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-8 text-center">
              Three connection modes
            </h2>
            <div className="space-y-5">
              {MODES.map((mode) => (
                <div key={mode.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${mode.badge}`}>
                      {mode.label}
                    </span>
                  </div>
                  <p className={`font-mono text-sm mb-2 ${mode.color}`}>{mode.diagram}</p>
                  <p className="text-sm text-slate-400">{mode.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Session flow */}
        <section className="py-12">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-8 text-center">
              Session flow — step by step
            </h2>
            <ol className="space-y-5">
              {SESSION_FLOW.map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary ring-1 ring-primary/30">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-100 text-sm">{step.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 bg-slate-900/50">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-8 text-center">
              Technical FAQ
            </h2>
            <dl className="space-y-5">
              {FAQ.map((item) => (
                <div key={item.q} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                  <dt className="font-semibold text-slate-100 text-sm">{item.q}</dt>
                  <dd className="mt-2 text-sm text-slate-400">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <div className="py-8 text-center">
          <Link href="/" className="text-sm text-primary hover:underline">
            ← Back to home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
