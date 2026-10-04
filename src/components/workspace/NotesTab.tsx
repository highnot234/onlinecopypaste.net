'use client';

import React, { useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReceivedNote {
  content: string;
  receivedAt: Date;
}

export interface NotesTabProps {
  send: (note: string) => void;
  received: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Notes tab — auto-growing textarea, send note, received notes as cards.
 */
export default function NotesTab({ send, received }: NotesTabProps) {
  const [note, setNote] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    // Auto-grow
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleSend = () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    send(trimmed);
    setNote('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    showToast('Note sent!', 'success');
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showToast('Copied!', 'success');
    } catch {
      showToast('Could not access clipboard', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Note input */}
      <div className="flex flex-col gap-2">
        <label htmlFor="note-input" className="text-sm font-medium text-slate-300">
          Write a note
        </label>
        <textarea
          ref={textareaRef}
          id="note-input"
          value={note}
          onChange={handleChange}
          placeholder="Type your note here…"
          rows={4}
          aria-label="Note to send"
          className={[
            'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 overflow-hidden',
            'text-sm text-slate-100 placeholder:text-slate-600 resize-none',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-800',
          ].join(' ')}
          style={{ minHeight: '100px' }}
        />
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={!note.trim()}
          >
            Send Note →
          </Button>
        </div>
      </div>

      {/* Received notes */}
      {received.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-slate-400">
            Received Notes ({received.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {received.map((item, i) => (
              <li
                key={i}
                className="rounded-lg border border-slate-700 bg-slate-800 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <pre className="flex-1 whitespace-pre-wrap break-all text-sm text-slate-200 font-sans min-w-0">
                    {item}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleCopy(item)}
                    aria-label="Copy note"
                    className="shrink-0"
                  >
                    📋 Copy
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {received.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-4">
          No notes received yet.
        </p>
      )}
    </div>
  );
}
