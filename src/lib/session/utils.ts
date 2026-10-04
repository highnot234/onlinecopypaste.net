// Session utility functions — server-only.
// This file is included in tsconfig.server.json — CommonJS-compatible only.

import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

/**
 * Generate a UUID v4 for use as a session ID.
 */
export function generateSessionId(): string {
  return uuidv4();
}

/**
 * Generate a random 6-digit numeric pair code (zero-padded).
 * e.g. '048291', '000000', '999999'
 */
export function generatePairCode(): string {
  const num = Math.floor(Math.random() * 1_000_000);
  return String(num).padStart(6, '0');
}

/**
 * Format a raw 6-digit code as 'XXX XXX' for display.
 * e.g. '482913' → '482 913'
 */
export function formatPairCode(raw: string): string {
  const digits = raw.replace(/\D/g, '').padStart(6, '0').slice(0, 6);
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

/**
 * Return the SHA-256 hex digest of a token string.
 * Used to store tokens in the session store without keeping the raw value.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
