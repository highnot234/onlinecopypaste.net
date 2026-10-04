'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useTransferQueue } from '@/hooks/useTransferQueue';
import { useSession } from '@/hooks/useSession';
import SessionTimer from '@/components/session/SessionTimer';
import DestroySession from '@/components/session/DestroySession';
import ConnectionStatus from '@/components/layout/ConnectionStatus';
import ClipboardTab from './ClipboardTab';
import CodeTab from './CodeTab';
import FilesTab from './FilesTab';
import LinksTab from './LinksTab';
import ImagesTab from './ImagesTab';
import NotesTab from './NotesTab';
import TransfersTab from './TransfersTab';
import type { PeerRole } from '@/types/index';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type TabId = 'clipboard' | 'code' | 'files' | 'links' | 'images' | 'notes' | 'transfers';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'clipboard', label: 'Clipboard', icon: '📋' },
  { id: 'code',      label: 'Code',      icon: '💻' },
  { id: 'files',     label: 'Files',     icon: '📁' },
  { id: 'links',     label: 'Links',     icon: '🔗' },
  { id: 'images',    label: 'Images',    icon: '🖼️' },
  { id: 'notes',     label: 'Notes',     icon: '📝' },
  { id: 'transfers', label: 'Transfers', icon: '⇅' },
];

// ---------------------------------------------------------------------------
// Received text/content state
// ---------------------------------------------------------------------------

interface ReceivedContent {
  clipboard: string[];
  code: string[];
  links: string[];
  notes: string[];
  images: Array<{ url: string; name: string }>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Main workspace shell rendered at /app.
 * Reads sessionId and token from sessionStorage (via useSession).
 * The role is passed in the URL (?role=pc|phone) but no sensitive token appears in the URL.
 * Manages WebRTC + transfer queue.
 */
export default function Workspace() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const role = (searchParams.get('role') ?? 'pc') as PeerRole;

  const [activeTab, setActiveTab] = useState<TabId>('clipboard');
  const [received, setReceived] = useState<ReceivedContent>({
    clipboard: [],
    code: [],
    links: [],
    notes: [],
    images: [],
  });

  const { session } = useSession();

  // Read sessionId and token from sessionStorage (via useSession) — never from URL
  const sessionId = session?.sessionId ?? '';
  const token = session?.token ?? '';

  // Redirect to home if no session in storage
  useEffect(() => {
    if (!sessionId || !token) {
      router.push('/');
    }
  }, [sessionId, token, router]);

  const { isConnected, isPaired, reconnecting, send, sendFile, onMessage } = useWebRTC({
    sessionId,
    token,
    role,
  });

  const {
    transfers,
    enqueue,
    cancel,
    receiveFileMeta,
    receiveChunk,
    receiveComplete,
  } = useTransferQueue();

  // Handle incoming DataChannel messages
  useEffect(() => {
    onMessage((data) => {
      if (typeof data !== 'string') return;
      try {
        const msg = JSON.parse(data) as {
          type?: string;
          content?: string;
          contentType?: string;
          transferId?: string;
          name?: string;
          size?: number;
          mimeType?: string;
          totalChunks?: number;
          receivedChunks?: number;
          url?: string;
          meta?: { name: string; mimeType: string; size: number; totalChunks: number; transferId: string };
          bytesTransferred?: number;
        };

        if (msg.type === 'text' && msg.content !== undefined) {
          const contentType = msg.contentType ?? 'text';
          const content = msg.content;

          if (content.startsWith('http://') || content.startsWith('https://')) {
            setReceived((prev) => ({ ...prev, links: [content, ...prev.links] }));
          } else if (contentType === 'code') {
            setReceived((prev) => ({ ...prev, code: [content, ...prev.code] }));
          } else {
            setReceived((prev) => ({ ...prev, clipboard: [content, ...prev.clipboard] }));
          }
        } else if (msg.type === 'file-meta' && msg.transferId) {
          receiveFileMeta({
            transferId: msg.transferId,
            name: msg.name ?? 'file',
            size: msg.size ?? 0,
            mimeType: msg.mimeType ?? 'application/octet-stream',
            totalChunks: msg.totalChunks ?? 1,
          });
        } else if (msg.type === '_file_ready' && msg.transferId && msg.url && msg.meta) {
          receiveComplete(msg.transferId, msg.url, msg.meta);
          if (msg.meta.mimeType.startsWith('image/')) {
            setReceived((prev) => ({
              ...prev,
              images: [{ url: msg.url!, name: msg.meta!.name }, ...prev.images],
            }));
          }
        } else if (msg.type === '_progress' && msg.transferId) {
          receiveChunk(
            msg.transferId,
            msg.receivedChunks ?? 0,
            msg.totalChunks ?? 1,
          );
        }
      } catch {
        // Non-JSON text — treat as clipboard content
        if (typeof data === 'string') {
          setReceived((prev) => ({ ...prev, clipboard: [data, ...prev.clipboard] }));
        }
      }
    });
  }, [onMessage, receiveFileMeta, receiveChunk, receiveComplete]);

  // ---------------------------------------------------------------------------
  // Send helpers
  // ---------------------------------------------------------------------------

  const sendText = useCallback(
    (content: string) => {
      send(JSON.stringify({ content, contentType: 'text' }));
    },
    [send],
  );

  const sendCode = useCallback(
    (content: string) => {
      send(JSON.stringify({ content, contentType: 'code' }));
    },
    [send],
  );

  const sendLink = useCallback(
    (url: string) => {
      send(JSON.stringify({ content: url, contentType: 'url' }));
    },
    [send],
  );

  const sendNote = useCallback(
    (content: string) => {
      send(JSON.stringify({ content, contentType: 'text' }));
    },
    [send],
  );

  const sendFiles = useCallback(
    (files: File[]) => {
      for (const file of files) {
        enqueue(file, async (_file, _transferId) => {
          // Delegate to DataChannelManager.sendFileMeta() which sends the JSON
          // metadata header followed by all binary chunks over the DataChannel.
          await sendFile(_file, _transferId);
        });
      }
    },
    [enqueue, sendFile],
  );

  const handleCancelTransfer = useCallback(
    (id: string) => {
      cancel(id);
      send(JSON.stringify({ type: 'file-cancel', transferId: id }));
    },
    [cancel, send],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!sessionId || !token) return null;

  const expiresAt = session?.expiresAt ? new Date(session.expiresAt) : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#0f172a]">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 flex-wrap">
          {/* Session info */}
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs text-slate-500">Session</p>
              <p className="font-mono text-sm font-bold text-slate-100 tracking-widest">
                {session?.pairCodeFormatted ?? '——— ———'}
              </p>
            </div>
            {expiresAt && (
              <SessionTimer expiresAt={expiresAt} onExpired={() => router.push('/')} />
            )}
          </div>

          {/* Status + actions */}
          <div className="flex items-center gap-3">
            <ConnectionStatus />
            {/* Pair status */}
            <span
              className={[
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                isPaired
                  ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                  : reconnecting
                  ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30'
                  : 'bg-slate-700 text-slate-400',
              ].join(' ')}
            >
              <span
                className={[
                  'h-1.5 w-1.5 rounded-full',
                  isPaired ? 'bg-green-400 animate-pulse' : reconnecting ? 'bg-yellow-400' : 'bg-slate-500',
                ].join(' ')}
                aria-hidden="true"
              />
              {isPaired ? 'Paired' : reconnecting ? 'Reconnecting…' : 'Waiting…'}
            </span>
            <DestroySession />
          </div>
        </div>

        {/* Tab bar */}
        <div
          className="flex overflow-x-auto border-t border-slate-800"
          role="tablist"
          aria-label="Workspace tabs"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                activeTab === tab.id
                  ? 'border-b-2 border-primary text-primary'
                  : 'border-b-2 border-transparent text-slate-400 hover:text-slate-200',
              ].join(' ')}
            >
              <span aria-hidden="true">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Connection overlay (shown while not connected) */}
      {!isConnected && (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center space-y-3">
            <p className="text-5xl" aria-hidden="true">
              {reconnecting ? '🔄' : '📱'}
            </p>
            <p className="text-lg font-semibold text-slate-200">
              {reconnecting ? 'Reconnecting…' : 'Waiting for device…'}
            </p>
            <p className="text-sm text-slate-400">
              {reconnecting
                ? 'Attempting to re-establish the connection'
                : 'Scan the QR code or enter the session code on your phone'}
            </p>
          </div>
        </div>
      )}

      {/* Tab panels */}
      {isConnected && (
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
          {TABS.map((tab) => (
            <div
              key={tab.id}
              id={`panel-${tab.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${tab.id}`}
              hidden={activeTab !== tab.id}
            >
              {activeTab === tab.id && (
                <>
                  {tab.id === 'clipboard' && (
                    <ClipboardTab send={sendText} received={received.clipboard} />
                  )}
                  {tab.id === 'code' && (
                    <CodeTab send={sendCode} received={received.code} />
                  )}
                  {tab.id === 'files' && (
                    <FilesTab
                      send={sendFiles}
                      transfers={Array.from(transfers.values())}
                      onCancel={handleCancelTransfer}
                    />
                  )}
                  {tab.id === 'links' && (
                    <LinksTab send={sendLink} received={received.links} />
                  )}
                  {tab.id === 'images' && (
                    <ImagesTab send={sendFiles} received={received.images} />
                  )}
                  {tab.id === 'notes' && (
                    <NotesTab send={sendNote} received={received.notes} />
                  )}
                  {tab.id === 'transfers' && (
                    <TransfersTab
                      transfers={Array.from(transfers.values())}
                      onCancel={handleCancelTransfer}
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </main>
      )}
    </div>
  );
}
