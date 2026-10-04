import { describe, it, expect } from 'vitest';
import { sanitizeFilename, isAllowedMimeType, formatFileSize, getFileIcon } from '@/lib/file-utils';

describe('sanitizeFilename', () => {
  it('leaves a safe filename unchanged', () => {
    expect(sanitizeFilename('document.pdf')).toBe('document.pdf');
  });

  it('replaces path separator characters', () => {
    // Both / and . are handled: / → _, leading dots stripped
    const result = sanitizeFilename('../etc/passwd');
    expect(result).not.toContain('/');
    expect(result).not.toMatch(/^\./); // no leading dots
  });

  it('replaces backslash path separators', () => {
    const result = sanitizeFilename('C:\\Windows\\system32');
    expect(result).not.toContain('\\');
    expect(result).toContain('Windows');
    expect(result).toContain('system32');
  });

  it('strips leading dots', () => {
    expect(sanitizeFilename('.hidden')).toBe('hidden');
  });

  it('strips multiple leading dots', () => {
    expect(sanitizeFilename('..secret')).toBe('secret');
  });

  it('limits to 255 characters', () => {
    const long = 'a'.repeat(300);
    expect(sanitizeFilename(long)).toHaveLength(255);
  });

  it('returns fallback for empty result', () => {
    expect(sanitizeFilename('')).toBe('file');
  });

  it('replaces special shell characters', () => {
    const result = sanitizeFilename('file*name?.txt');
    expect(result).not.toContain('*');
    expect(result).not.toContain('?');
  });
});

describe('isAllowedMimeType', () => {
  it('allows image MIME types', () => {
    expect(isAllowedMimeType('image/jpeg')).toBe(true);
    expect(isAllowedMimeType('image/png')).toBe(true);
    expect(isAllowedMimeType('image/gif')).toBe(true);
    expect(isAllowedMimeType('image/webp')).toBe(true);
  });

  it('allows text MIME types', () => {
    expect(isAllowedMimeType('text/plain')).toBe(true);
    expect(isAllowedMimeType('text/html')).toBe(true);
    expect(isAllowedMimeType('text/css')).toBe(true);
  });

  it('allows application/pdf', () => {
    expect(isAllowedMimeType('application/pdf')).toBe(true);
  });

  it('allows application/zip', () => {
    expect(isAllowedMimeType('application/zip')).toBe(true);
  });

  it('allows application/json', () => {
    expect(isAllowedMimeType('application/json')).toBe(true);
  });

  it('rejects unknown MIME types', () => {
    expect(isAllowedMimeType('application/x-executable')).toBe(false);
    expect(isAllowedMimeType('application/x-msdownload')).toBe(false);
  });

  it('handles MIME types with charset parameter', () => {
    expect(isAllowedMimeType('text/plain; charset=utf-8')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isAllowedMimeType('')).toBe(false);
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1_572_864)).toBe('1.5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(1_610_612_736)).toBe('1.5 GB');
  });

  it('formats exactly 1024 bytes as KB', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
  });
});

describe('getFileIcon', () => {
  it('returns image icon for image/* types', () => {
    expect(getFileIcon('image/jpeg')).toBe('🖼️');
    expect(getFileIcon('image/png')).toBe('🖼️');
  });

  it('returns PDF icon for application/pdf', () => {
    expect(getFileIcon('application/pdf')).toBe('📕');
  });

  it('returns archive icon for zip', () => {
    expect(getFileIcon('application/zip')).toBe('🗜️');
  });

  it('returns text icon for text/*', () => {
    expect(getFileIcon('text/plain')).toBe('📝');
  });

  it('returns default icon for unknown types', () => {
    expect(getFileIcon('application/octet-stream')).toBe('📄');
  });

  it('returns default icon for empty string', () => {
    expect(getFileIcon('')).toBe('📄');
  });
});
