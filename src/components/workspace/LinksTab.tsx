'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LinksTabProps {
  send: (url: string) => void;
  received: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidUrl(s: string): boolean {
  try {
    const url = new URL(s);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Links tab — send and receive URLs.
 * Received URLs shown as clickable links with Open and Copy buttons.
 */
export default function LinksTab({ send, received }: LinksTabProps) {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const { showToast } = useToast();

  const handleSend = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!isValidUrl(trimmed)) {
      setUrlError('Please enter a valid http:// or https:// URL');
      return;
    }
    setUrlError('');
    send(trimmed);
    setUrl('');
    showToast('Link sent!', 'success');
  };

  const handleCopy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      showToast('Copied!', 'success');
    } catch {
      showToast('Could not access clipboard', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* URL input */}
      <div className="flex flex-col gap-2">
        <label htmlFor="url-input" className="text-sm font-medium text-slate-300">
          Enter a URL to send
        </label>
        <div className="flex gap-2">
          <input
            id="url-input"
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setUrlError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="https://example.com"
            aria-label="URL to send"
            aria-describedby={urlError ? 'url-error' : undefined}
            className={[
              'flex-1 rounded-lg border bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-800',
              urlError ? 'border-red-500' : 'border-slate-700',
            ].join(' ')}
          />
          <Button variant="primary" size="md" onClick={handleSend} disabled={!url.trim()}>
            Send
          </Button>
        </div>
        {urlError && (
          <p id="url-error" role="alert" className="text-xs text-red-400">
            {urlError}
          </p>
        )}
      </div>

      {/* Received links */}
      {received.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-slate-400">
            Received Links ({received.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {received.map((link, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5"
              >
                {/* Favicon placeholder */}
                <span className="shrink-0 text-lg" aria-hidden="true">🔗</span>
                <div className="min-w-0 flex-1">
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm text-primary hover:underline"
                    title={link}
                  >
                    {link}
                  </a>
                  <p className="text-xs text-slate-500 truncate">{extractDomain(link)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={`Open ${link}`}
                  >
                    Open
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleCopy(link)}
                    aria-label={`Copy ${link}`}
                  >
                    Copy
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {received.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-4">
          No links received yet.
        </p>
      )}
    </div>
  );
}
