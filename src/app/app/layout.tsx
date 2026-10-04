import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Workspace — Online Copy Paste',
  description:
    'Your active OnlineCopyPaste workspace. Transfer files, text, code, links, and images between your paired devices.',
  robots: { index: false, follow: false },
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
