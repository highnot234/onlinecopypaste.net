// Content type and language detection utilities.
// Used by both the client and server — no browser or Node-only APIs.

import type { ContentType } from '@/types/index';

/**
 * Detect the high-level content type of a string.
 */
export function detectContentType(content: string): ContentType {
  const trimmed = content.trim();

  // URL detection
  if (/^https?:\/\/\S+/.test(trimmed)) {
    return 'url';
  }

  // JSON detection
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // Not valid JSON — fall through
    }
  }

  // Code heuristics
  if (_looksLikeCode(trimmed)) {
    return 'code';
  }

  return 'text';
}

/**
 * Detect the programming language for a code string.
 * Returns a Prism.js-compatible language key.
 */
export function detectLanguage(code: string): string {
  const s = code.trim();

  // TypeScript (must come before JavaScript)
  if (
    /:\s*(string|number|boolean|void|any|unknown|never)\b/.test(s) ||
    /interface\s+\w+/.test(s) ||
    /type\s+\w+\s*=/.test(s) ||
    /as\s+(string|number|boolean|any)\b/.test(s)
  ) {
    return 'typescript';
  }

  // JavaScript
  if (
    /\b(const|let|var|function|async|await|export|import)\b/.test(s) ||
    /=>\s*[{(]/.test(s) ||
    /require\s*\(/.test(s) ||
    /module\.exports/.test(s)
  ) {
    return 'javascript';
  }

  // Python
  if (
    /^def\s+\w+\s*\(/.test(s) ||
    /^class\s+\w+[:(]/.test(s) ||
    /\bprint\s*\(/.test(s) ||
    /^import\s+\w+$/.test(s) ||
    /^from\s+\w+\s+import\b/.test(s) ||
    /:\s*$/.test(s.split('\n')[0])
  ) {
    return 'python';
  }

  // CSS / SCSS
  if (
    /[.#][\w-]+\s*\{/.test(s) ||
    /:\s*[\w-]+\s*;/.test(s) ||
    /@media\s/.test(s) ||
    /\$[\w-]+\s*:/.test(s)
  ) {
    return 'css';
  }

  // JSON (should already be caught by detectContentType, but handled here too)
  if (s.startsWith('{') || s.startsWith('[')) {
    return 'json';
  }

  // HTML / JSX
  if (/<[A-Za-z][A-Za-z0-9]*[\s/>]/.test(s) || /<\/[A-Za-z]/.test(s)) {
    return 'markup';
  }

  // Shell / Bash
  if (
    /^#!\/bin\/(ba)?sh/.test(s) ||
    /^\$\s+/.test(s) ||
    /\b(echo|chmod|chown|sudo|apt|yum|brew|npm|pip)\b/.test(s)
  ) {
    return 'bash';
  }

  // SQL
  if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|FROM|WHERE|JOIN)\b/i.test(s)) {
    return 'sql';
  }

  return 'plaintext';
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function _looksLikeCode(s: string): boolean {
  // Multiple lines with common code constructs
  const lines = s.split('\n');
  if (lines.length < 2) {
    // Single-line code patterns
    return (
      /[{};()=>]/.test(s) &&
      (/\b(const|let|var|function|class|import|export|return|if|for|while)\b/.test(s) ||
        /^\s*(def|class|import|from|return)\s/.test(s))
    );
  }

  // Count "code-like" lines
  let codeLines = 0;
  for (const line of lines) {
    if (
      /^\s*(\/\/|#|\/\*)/.test(line) || // comments
      /[{};]/.test(line) || // braces/semicolons
      /^\s+(if|for|while|return|const|let|var|def|class)\b/.test(line) || // indented keywords
      /=>\s/.test(line) // arrow functions
    ) {
      codeLines++;
    }
  }

  return codeLines / lines.length > 0.25;
}
