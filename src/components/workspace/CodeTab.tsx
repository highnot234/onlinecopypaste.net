'use client';

import React, { useEffect, useRef, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { detectLanguage } from '@/lib/content-detection';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CodeTabProps {
  send: (data: string) => void;
  received: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Code editor tab with syntax-highlighted preview.
 * Sends code snippets to the paired device. Received snippets shown with copy.
 */
export default function CodeTab({ send, received }: CodeTabProps) {
  const [code, setCode] = useState('');
  const { showToast } = useToast();

  const handleSend = () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    send(trimmed);
    setCode('');
    showToast('Code sent!', 'success');
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showToast('Copied to clipboard', 'success');
    } catch {
      showToast('Could not access clipboard', 'error');
    }
  };

  const detectedLang = detectLanguage(code);

  return (
    <div className="flex flex-col gap-4">
      {/* Editor */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="code-input" className="text-sm font-medium text-slate-300">
            Paste or write code
          </label>
          {code && (
            <span className="text-xs text-slate-500">
              Detected: <span className="text-primary">{detectedLang}</span>
            </span>
          )}
        </div>
        <textarea
          id="code-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="// Paste your code here…"
          rows={10}
          spellCheck={false}
          aria-label="Code to send"
          className={[
            'w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5',
            'font-mono text-sm text-slate-100 placeholder:text-slate-600',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-800',
            'leading-relaxed',
          ].join(' ')}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setCode('')} disabled={!code}>
            Clear
          </Button>
          <Button variant="primary" size="sm" onClick={handleSend} disabled={!code.trim()}>
            Send Code →
          </Button>
        </div>
      </div>

      {/* Received snippets */}
      {received.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-slate-400">
            Received ({received.length})
          </h3>
          {received.map((snippet, i) => (
            <ReceivedSnippet
              key={i}
              snippet={snippet}
              onCopy={() => void handleCopy(snippet)}
            />
          ))}
        </div>
      )}

      {received.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-4">
          No code received yet.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReceivedSnippet sub-component
// ---------------------------------------------------------------------------

function ReceivedSnippet({
  snippet,
  onCopy,
}: {
  snippet: string;
  onCopy: () => void;
}) {
  const codeRef = useRef<HTMLElement>(null);
  const lang = detectLanguage(snippet);
  const prismLang = lang in Prism.languages ? lang : 'javascript';

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [snippet]);

  return (
    <div className="code-block overflow-hidden rounded-lg border border-slate-700">
      <div className="flex items-center justify-between bg-slate-800 px-3 py-1.5 border-b border-slate-700">
        <span className="text-xs text-primary">{lang}</span>
        <Button variant="ghost" size="sm" onClick={onCopy} aria-label="Copy snippet">
          📋 Copy
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed max-h-80">
        <code ref={codeRef} className={`language-${prismLang}`}>
          {snippet}
        </code>
      </pre>
    </div>
  );
}
