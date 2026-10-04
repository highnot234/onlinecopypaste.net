import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AdSlot from '@/components/ads/AdSlot';

export const metadata: Metadata = {
  title: 'Transfer Files Between Phone and Computer — Online Copy Paste',
  description:
    'Transfer images, PDFs, ZIPs, code, and documents between your phone and PC instantly. No login required, peer-to-peer encrypted, session auto-deletes.',
  openGraph: {
    title: 'Transfer Files Between Phone and Computer',
    description: 'Instantly transfer any file between phone and PC. No account, no USB, no app.',
    url: 'https://onlinecopypaste.net/file-transfer',
  },
};

const FILE_TYPES = [
  { icon: '🖼️', type: 'Images', desc: 'JPG, PNG, GIF, WebP, SVG, HEIC' },
  { icon: '📕', type: 'PDFs', desc: 'Documents, presentations, reports' },
  { icon: '🗜️', type: 'Archives', desc: 'ZIP, TAR, GZ, RAR, 7Z' },
  { icon: '📝', type: 'Text & Code', desc: 'TXT, JS, TS, PY, CSS, HTML, JSON' },
  { icon: '📘', type: 'Documents', desc: 'DOCX, XLSX, PPTX, and older Office formats' },
  { icon: '🎬', type: 'Videos', desc: 'MP4 and WebM (subject to size limit)' },
];

export default function FileTransferPage() {
  return (
    <>
      <Header />
      <main>
        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 leading-tight">
              Transfer files between{' '}
              <span className="text-primary">phone and computer</span>
            </h1>
            <p className="mt-5 text-lg text-slate-400">
              Send images, PDFs, archives, code files, and documents — up to 100 MB per
              file — directly between devices with no account required.
            </p>
            <div className="mt-8">
              <Link
                href="/#session-creator"
                className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-base font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                ⚡ Start Transferring
              </Link>
            </div>
          </div>
        </section>

        <AdSlot slot="file-transfer-top" className="mx-auto max-w-4xl px-4 sm:px-6 mb-8" />

        <section className="py-12 bg-slate-900/50">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-8 text-center">
              Supported file types
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {FILE_TYPES.map((f) => (
                <div
                  key={f.type}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="text-3xl mb-2">{f.icon}</div>
                  <p className="font-semibold text-slate-100 text-sm">{f.type}</p>
                  <p className="text-xs text-slate-500 mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-6 text-center">
              Privacy & file handling
            </h2>
            <div className="space-y-4 text-sm text-slate-400">
              <p>
                File content is transferred directly between your phone and computer using
                WebRTC DataChannels. The signaling server (used only during the initial
                connection handshake) never receives or stores file content.
              </p>
              <p>
                Files are not saved to any database or disk. They exist only in your
                browser&apos;s memory during the active session. When you destroy the session
                or close the tab, no file data persists.
              </p>
              <p>
                The default maximum file size is 100 MB. Files are transferred in 64 KB
                chunks with real-time progress tracking. Large transfers can be paused
                or cancelled from the Transfers tab.
              </p>
            </div>
          </div>
        </section>

        <div className="py-8 text-center">
          <Link
            href="/#session-creator"
            className="inline-flex items-center rounded-lg bg-primary px-8 py-3 text-base font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Try It Free — No Account Needed
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
