// File utility functions.
// No browser-only or Node-only APIs — safe for both environments.

/**
 * Allowed MIME type prefixes and exact types.
 * Extend this list if new content types need to be supported.
 */
const ALLOWED_MIME_PREFIXES = ['image/', 'text/', 'video/mp4', 'video/webm'];

const ALLOWED_MIME_EXACT = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/json',
  'application/javascript',
  'application/typescript',
  'application/xml',
  'application/octet-stream',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/msword', // .doc
  'application/vnd.ms-excel', // .xls
  'application/vnd.ms-powerpoint', // .ppt
  'application/x-tar',
  'application/gzip',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
]);

/**
 * Characters that are dangerous in filenames (path traversal, shell injection, etc.)
 */
const UNSAFE_FILENAME_RE = /[/\\:*?"<>|]/g;

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Sanitize a filename by removing path traversal characters and limiting length.
 * Returns a safe filename string.
 */
export function sanitizeFilename(name: string): string {
  // Remove directory separators and other unsafe characters
  let safe = name.replace(UNSAFE_FILENAME_RE, '_');

  // Strip leading dots (hidden files / Unix dotfiles becoming traversal vectors)
  safe = safe.replace(/^\.+/, '');

  // Limit length to 255 characters (most filesystems)
  safe = safe.slice(0, 255);

  // Ensure there's something left
  if (!safe || safe === '_') {
    safe = 'file';
  }

  return safe;
}

/**
 * Check whether a MIME type is in the application's allowlist.
 */
export function isAllowedMimeType(mimeType: string): boolean {
  if (!mimeType) return false;
  const lower = mimeType.toLowerCase().split(';')[0].trim();

  if (ALLOWED_MIME_EXACT.has(lower)) return true;

  for (const prefix of ALLOWED_MIME_PREFIXES) {
    if (lower.startsWith(prefix)) return true;
  }

  return false;
}

/**
 * Format a byte count as a human-readable string.
 * e.g. 1572864 → '1.5 MB'
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Return an emoji icon identifier for a MIME type.
 * Used in file lists where a full icon set is not available.
 */
export function getFileIcon(mimeType: string): string {
  if (!mimeType) return '📄';
  const lower = mimeType.toLowerCase();

  if (lower.startsWith('image/')) return '🖼️';
  if (lower.startsWith('video/')) return '🎬';
  if (lower.startsWith('audio/')) return '🎵';
  if (lower === 'application/pdf') return '📕';
  if (lower === 'application/zip' || lower === 'application/x-zip-compressed') return '🗜️';
  if (lower === 'application/x-tar' || lower === 'application/gzip') return '🗜️';
  if (lower === 'application/x-7z-compressed' || lower === 'application/x-rar-compressed') return '🗜️';
  if (lower.startsWith('text/')) return '📝';
  if (lower === 'application/json') return '{ }';
  if (lower.includes('word') || lower === 'application/msword') return '📘';
  if (lower.includes('excel') || lower === 'application/vnd.ms-excel') return '📗';
  if (lower.includes('presentation') || lower === 'application/vnd.ms-powerpoint') return '📙';

  return '📄';
}
