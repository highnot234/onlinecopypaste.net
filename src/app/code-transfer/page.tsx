import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AdSlot from '@/components/ads/AdSlot';

export const metadata: Metadata = {
  title: 'Share Code Between Devices — Syntax Highlighted, No Login',
  description:
    'Transfer code snippets between your phone and computer instantly. Syntax highlighting for JavaScript, TypeScript, Python, CSS, and more. No account required.',
  openGraph: {
    title: 'Share Code Between Devices — Syntax Highlighted',
    description: 'Transfer code snippets between phone and PC. Syntax highlighted, no login.',
    url: 'https://onlinecopypaste.net/code-transfer',
  },
};

const LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'CSS', 'JSON', 'HTML',
  'SQL', 'Bash', 'YAML', 'Markdown',
];

const CODE_USE_CASES = [
  { icon: '🎓', title: 'Students', desc: 'Transfer your assignment or lab code from phone to the college PC without WhatsApp.' },
  { icon: '👨‍💻', title: 'Developers', desc: 'Quickly share env vars, config snippets, or API keys between your devices during a session.' },
  { icon: '🧑‍🏫', title: 'Teaching', desc: 'Share code examples from your phone to the projector PC during a lecture.' },
  { icon: '🔧', title: 'Debugging', desc: 'Transfer error messages, stack traces, or logs from a device to your primary workstation.' },
];

export default function CodeTransferPage() {
  return (
    <>
      <Header />
      <main>
        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 leading-tight">
              Share code between{' '}
              <span className="text-primary">devices instantly</span>
            </h1>
            <p className="mt-5 text-lg text-slate-400">
              Transfer code snippets with syntax highlighting between your phone and
              computer. No login, no IDE plugin, no USB drive.
            </p>
            <div className="mt-8">
              <Link
                href="/#session-creator"
                className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-base font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                ⚡ Start Code Transfer
              </Link>
            </div>
          </div>
        </section>

        <AdSlot slot="code-transfer-top" className="mx-auto max-w-4xl px-4 sm:px-6 mb-8" />

        {/* Code example */}
        <section className="py-12 bg-slate-900/50">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-6 text-center">
              Syntax highlighted preview
            </h2>
            <div className="code-block rounded-xl overflow-hidden border border-slate-700">
              <div className="flex items-center justify-between bg-slate-800 px-4 py-2 border-b border-slate-700">
                <span className="text-xs text-slate-400">example.ts</span>
                <span className="text-xs text-primary">TypeScript</span>
              </div>
              <pre className="p-4 text-xs text-slate-300 overflow-x-auto">
                <code>{`// Send code from your phone to this PC
async function transferCode(code: string) {
  const session = await createSession({ duration: 30 });
  await session.send({ type: 'code', content: code });
  console.log('Code transferred!');
}`}</code>
              </pre>
            </div>
            <p className="mt-4 text-xs text-slate-500 text-center">
              Language is auto-detected. Supported: {LANGUAGES.join(', ')}.
            </p>
          </div>
        </section>

        {/* Use cases */}
        <section className="py-12">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-8 text-center">
              Who uses code transfer?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {CODE_USE_CASES.map((uc) => (
                <div
                  key={uc.title}
                  className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5"
                >
                  <span className="text-3xl shrink-0">{uc.icon}</span>
                  <div>
                    <h3 className="font-semibold text-slate-100">{uc.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{uc.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="py-8 text-center">
          <Link
            href="/#session-creator"
            className="inline-flex items-center rounded-lg bg-primary px-8 py-3 text-base font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Try It Free
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
