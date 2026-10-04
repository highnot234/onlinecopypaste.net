import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AdSlot from '@/components/ads/AdSlot';

export const metadata: Metadata = {
  title: 'Send Files from Phone to PC Without USB — Online Copy Paste',
  description:
    'Transfer files, photos, documents, and code from your phone to a PC without USB, WhatsApp, or Google Drive. Just scan a QR code — no account required.',
  openGraph: {
    title: 'Send Files from Phone to PC Without USB',
    description:
      'Instantly transfer any file from your phone to a computer. No USB, no login, no app required.',
    url: 'https://onlinecopypaste.net/phone-to-pc',
  },
};

const STEPS = [
  { title: 'Open onlinecopypaste.net on the PC', desc: 'Works in any browser — Chrome, Firefox, Safari, Edge.' },
  { title: 'Click "Start Session"', desc: 'A QR code and a 6-digit code appear instantly.' },
  { title: 'Scan the QR code on your phone', desc: 'Or go to onlinecopypaste.net/join and enter the code manually.' },
  { title: 'Select files to send', desc: 'From your phone, tap the Files tab and pick the files you want to transfer.' },
  { title: 'Files appear on the PC', desc: 'Download them immediately. Then hit "Destroy Session" to clean up.' },
];

const ALTERNATIVES = [
  { name: 'WhatsApp', issue: 'Requires WhatsApp login — exposes your phone number and chat history to the lab PC.' },
  { name: 'Google Drive', issue: 'Requires Google login — leaves your account signed in on a shared machine.' },
  { name: 'Email', issue: 'Files pass through third-party mail servers and remain in your Sent folder.' },
  { name: 'USB Drive', issue: 'You may not have one, or the lab PC may block USB storage for security.' },
  { name: 'OnlineCopyPaste', issue: '✓ No login. No account. Session destroyed when done. Works right now.' },
];

const FAQ = [
  {
    q: 'Do I need to install anything?',
    a: 'No. OnlineCopyPaste works entirely in the browser. Nothing is installed on the lab PC.',
  },
  {
    q: 'What file types can I send?',
    a: 'Images (JPG, PNG, GIF, WebP), PDFs, ZIP archives, text files, code files, Word/Excel documents, and more.',
  },
  {
    q: 'Is there a file size limit?',
    a: 'The default maximum is 100 MB per file. Larger files can be zipped before sending.',
  },
  {
    q: 'Does the file go through your server?',
    a: 'No. File content is transferred peer-to-peer using WebRTC DataChannels, encrypted with DTLS. The signaling server only helps the two devices find each other — it never sees the file content.',
  },
];

export default function PhoneToPcPage() {
  return (
    <>
      <Header />
      <main>
        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 leading-tight">
              Send files from{' '}
              <span className="text-primary">phone to PC</span>{' '}
              without USB
            </h1>
            <p className="mt-5 text-lg text-slate-400">
              No cable, no account, no app required. Just scan a QR code and your
              files appear on the computer — in seconds.
            </p>
            <div className="mt-8">
              <Link
                href="/#session-creator"
                className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-base font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                ⚡ Start Free Transfer
              </Link>
            </div>
          </div>
        </section>

        <AdSlot slot="phone-to-pc-top" className="mx-auto max-w-4xl px-4 sm:px-6 mb-8" />

        {/* Step-by-step guide */}
        <section className="py-12 bg-slate-900/50">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-8 text-center">
              How to transfer files — step by step
            </h2>
            <ol className="space-y-5">
              {STEPS.map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary ring-1 ring-primary/30">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-100">{s.title}</p>
                    <p className="mt-0.5 text-sm text-slate-400">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Comparison */}
        <section className="py-12">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-8 text-center">
              Why not use WhatsApp or Google Drive?
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800">
                    <th className="px-4 py-3 text-left text-slate-300 font-semibold">Method</th>
                    <th className="px-4 py-3 text-left text-slate-300 font-semibold">Privacy concern on shared PC</th>
                  </tr>
                </thead>
                <tbody>
                  {ALTERNATIVES.map((alt) => (
                    <tr key={alt.name} className="border-b border-slate-800 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-200 whitespace-nowrap">{alt.name}</td>
                      <td className={`px-4 py-3 ${alt.name === 'OnlineCopyPaste' ? 'text-green-400' : 'text-slate-400'}`}>
                        {alt.issue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 bg-slate-900/50">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-8 text-center">FAQ</h2>
            <dl className="space-y-5">
              {FAQ.map((item) => (
                <div key={item.q} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                  <dt className="font-semibold text-slate-100">{item.q}</dt>
                  <dd className="mt-2 text-sm text-slate-400">{item.a}</dd>
                </div>
              ))}
            </dl>
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
