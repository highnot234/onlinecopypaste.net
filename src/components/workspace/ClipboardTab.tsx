'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClipboardTabProps {
  send: (data: string) => void;
  received: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Clipboard tab — type or paste text and send it to the paired device.
 * Received items appear below with individual Copy buttons.
 */
export default function ClipboardTab({ send, received }: ClipboardTabProps) {
  const [text, setText] = useState('');
  const { showToast } = useToast();

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    send(trimmed);
    setText('');
    showToast('Sent!', 'success');
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showToast('Copied to clipboard', 'success');
    } catch {
      showToast('Could not access clipboard', 'error');
    }
  };

  const charCount = text.length;
  const maxChars = 50_000;

  return (
    <div className="flex flex-col gap-4">
      {/* Input area */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="clipboard-input" className="text-sm font-medium text-slate-300">
            Type or paste text to send
          </label>
          <span className={`text-xs ${charCount > maxChars * 0.9 ? 'text-yellow-400' : 'text-slate-500'}`}>
            {charCount.toLocaleString()} / {maxChars.toLocaleString()}
          </span>
        </div>
        <textarea
          id="clipboard-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type text here…"
          maxLength={maxChars}
          rows={6}
          aria-label="Text to send"
          className={[
            'w-full resize-y rounded-lg border bg-slate-900 px-3 py-2.5',
            'text-sm text-slate-100 placeholder:text-slate-600',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-800',
            'border-slate-700',
          ].join(' ')}
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setText('')}
            disabled={!text}
          >
            Clear
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={!text.trim()}
          >
            Send →
          </Button>
        </div>
      </div>

      {/* Received items */}
      {received.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-slate-400">
            Received ({received.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {received.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg border border-slate-700 bg-slate-800 p-3"
              >
                <pre className="flex-1 whitespace-pre-wrap break-all text-sm text-slate-200 font-sans min-w-0">
                  {item}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleCopy(item)}
                  aria-label="Copy to clipboard"
                  className="shrink-0"
                >
                  📋 Copy
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {received.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-4">
          Nothing received yet. Send something from your phone!
        </p>
      )}
    </div>
  );
}
