'use client';

// Prism.js — only import specific language components to keep bundle small.
// Import the core first, then language packs.
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';

import React, { useEffect, useRef } from 'react';
import { detectLanguage } from '@/lib/content-detection';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilePreviewFile {
  name: string;
  mimeType: string;
  url: string;         // object URL (blob: ...) or data URL
  content?: string;   // text content (for text/* and code preview)
}

export interface FilePreviewProps {
  file: FilePreviewFile;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a language name to a Prism grammar key. */
function getPrismLanguage(lang: string): string {
  const map: Record<string, string> = {
    javascript: 'javascript',
    typescript: 'typescript',
    python: 'python',
    css: 'css',
    json: 'json',
  };
  return map[lang] ?? 'javascript';
}

/** Check if a Prism grammar is loaded. */
function isPrismLoaded(lang: string): boolean {
  return lang in Prism.languages;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a preview of a transferred file based on MIME type:
 * - image/*          → <img> with object URL
 * - application/pdf  → <iframe> embed
 * - text/* (plain)   → <pre> with content
 * - text/x-* / code  → Prism.js syntax-highlighted block
 * - application/json → formatted <pre>
 * - URL string       → clickable <a> link
 * - unsupported      → file icon + download link
 */
export function FilePreview({ file }: FilePreviewProps) {
  const { name, mimeType, url, content } = file;
  const codeRef = useRef<HTMLElement>(null);

  // Run Prism highlighting after render for code blocks
  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [content, mimeType]);

  // ---------------------------------------------------------------------------
  // Image preview
  // ---------------------------------------------------------------------------
  if (mimeType.startsWith('image/')) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name}
          className="max-h-96 w-full object-contain"
          loading="lazy"
        />
        <div className="flex items-center justify-between border-t border-slate-700 bg-slate-800 px-3 py-2">
          <span className="truncate text-sm text-slate-300">{name}</span>
          <a
            href={url}
            download={name}
            className="ml-2 shrink-0 rounded bg-primary px-2 py-1 text-xs text-white hover:bg-indigo-600"
          >
            Download
          </a>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PDF preview
  // ---------------------------------------------------------------------------
  if (mimeType === 'application/pdf') {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
        <iframe
          src={url}
          title={name}
          className="h-96 w-full"
          aria-label={`PDF preview of ${name}`}
        />
        <div className="flex items-center justify-between border-t border-slate-700 bg-slate-800 px-3 py-2">
          <span className="truncate text-sm text-slate-300">{name}</span>
          <a
            href={url}
            download={name}
            className="ml-2 shrink-0 rounded bg-primary px-2 py-1 text-xs text-white hover:bg-indigo-600"
          >
            Download
          </a>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // JSON preview — formatted
  // ---------------------------------------------------------------------------
  if (mimeType === 'application/json' && content) {
    let formatted = content;
    try {
      formatted = JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      // Not valid JSON — show as-is
    }
    return (
      <div className="code-block overflow-hidden rounded-lg border border-slate-700">
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-3 py-1.5">
          <span className="text-xs text-slate-400">{name}</span>
          <span className="text-xs text-primary">JSON</span>
        </div>
        <pre className="max-h-80 overflow-auto p-4 text-xs leading-relaxed text-slate-200">
          <code ref={codeRef} className="language-json">
            {formatted}
          </code>
        </pre>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // URL preview
  // ---------------------------------------------------------------------------
  if (content && (content.startsWith('http://') || content.startsWith('https://'))) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
        <p className="mb-1 text-xs text-slate-400">Link</p>
        <a
          href={content}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 break-all text-sm text-primary hover:underline"
        >
          {content}
          <span className="text-slate-400" aria-hidden="true">↗</span>
        </a>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Code / text with syntax highlighting
  // ---------------------------------------------------------------------------
  if (
    content &&
    (mimeType.startsWith('text/') ||
      mimeType === 'application/javascript' ||
      mimeType === 'application/typescript' ||
      mimeType === 'application/xml')
  ) {
    const detectedLang = detectLanguage(content);
    const prismLang = getPrismLanguage(detectedLang);
    const grammarLoaded = isPrismLoaded(prismLang);
    const isCode =
      mimeType !== 'text/plain' ||
      ['javascript', 'typescript', 'python', 'css', 'json'].includes(detectedLang);

    return (
      <div className="code-block overflow-hidden rounded-lg border border-slate-700">
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-3 py-1.5">
          <span className="text-xs text-slate-400">{name}</span>
          {isCode && grammarLoaded && (
            <span className="text-xs text-primary">{detectedLang}</span>
          )}
        </div>
        <pre className="max-h-80 overflow-auto p-4 text-xs leading-relaxed text-slate-200">
          {isCode && grammarLoaded ? (
            <code ref={codeRef} className={`language-${prismLang}`}>
              {content}
            </code>
          ) : (
            <code className="text-slate-200">{content}</code>
          )}
        </pre>
        {url && (
          <div className="border-t border-slate-700 bg-slate-800 px-3 py-1.5">
            <a
              href={url}
              download={name}
              className="text-xs text-primary hover:underline"
            >
              Download file
            </a>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Generic fallback — icon + download link
  // ---------------------------------------------------------------------------
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 p-4">
      <span className="text-3xl" aria-hidden="true">📄</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-100">{name}</p>
        <p className="text-xs text-slate-400">{mimeType}</p>
      </div>
      {url && (
        <a
          href={url}
          download={name}
          className="shrink-0 rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-800"
          aria-label={`Download ${name}`}
        >
          Download
        </a>
      )}
    </div>
  );
}
