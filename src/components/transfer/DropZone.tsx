'use client';

import React, { useRef, useState, useCallback, useId } from 'react';
import { isAllowedMimeType, formatFileSize } from '@/lib/file-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

type DropZoneState = 'idle' | 'dragover' | 'error';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE_MB =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB
    ? parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB, 10)
    : 100;

const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_TYPES_DISPLAY =
  'Images, PDFs, ZIP, text files, code, documents, videos';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateFiles(files: FileList | File[]): { valid: File[]; errors: string[] } {
  const valid: File[] = [];
  const errors: string[] = [];

  for (const file of Array.from(files)) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      errors.push(`"${file.name}" exceeds the ${MAX_FILE_SIZE_MB} MB limit`);
      continue;
    }

    const mime = file.type || 'application/octet-stream';
    if (!isAllowedMimeType(mime)) {
      errors.push(`"${file.name}" has an unsupported file type (${mime})`);
      continue;
    }

    valid.push(file);
  }

  return { valid, errors };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Drag-and-drop file upload area.
 *
 * Accessibility:
 * - role="button" with aria-label
 * - Keyboard handler: Enter/Space activates the hidden file input
 * - aria-disabled when disabled
 * - Visible focus ring
 */
export function DropZone({ onFilesSelected, disabled = false }: DropZoneProps) {
  const [dropState, setDropState] = useState<DropZoneState>('idle');
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      setErrorMessages([]);
      const { valid, errors } = validateFiles(files);
      if (errors.length > 0) {
        setErrorMessages(errors);
        setDropState('error');
        // Auto-clear error state after 4s
        setTimeout(() => {
          setDropState('idle');
          setErrorMessages([]);
        }, 4000);
      }
      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    },
    [onFilesSelected],
  );

  // ---------------------------------------------------------------------------
  // Drag events
  // ---------------------------------------------------------------------------

  const onDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setDropState('dragover');
    },
    [disabled],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        e.dataTransfer.dropEffect = 'copy';
        setDropState('dragover');
      }
    },
    [disabled],
  );

  const onDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      // Only reset if we're leaving the zone (not entering a child element)
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setDropState('idle');
    },
    [],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDropState('idle');

      if (disabled) return;
      const { files } = e.dataTransfer;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    },
    [disabled, handleFiles],
  );

  // ---------------------------------------------------------------------------
  // Click / keyboard
  // ---------------------------------------------------------------------------

  const openFilePicker = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFilePicker();
      }
    },
    [openFilePicker],
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [handleFiles],
  );

  // ---------------------------------------------------------------------------
  // Visual states
  // ---------------------------------------------------------------------------

  const containerClass = [
    'relative flex min-h-[140px] w-full cursor-pointer flex-col items-center justify-center gap-3',
    'rounded-xl border-2 border-dashed p-6 transition-all duration-200',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
    disabled
      ? 'cursor-not-allowed border-slate-700 bg-slate-800/40 opacity-50'
      : dropState === 'dragover'
      ? 'border-primary bg-primary/10 scale-[1.01]'
      : dropState === 'error'
      ? 'border-danger bg-danger/10'
      : 'border-slate-600 bg-slate-800/60 hover:border-primary/60 hover:bg-slate-800',
  ].join(' ');

  const icon =
    dropState === 'dragover'
      ? '📂'
      : dropState === 'error'
      ? '⚠️'
      : '📤';

  const heading =
    dropState === 'dragover'
      ? 'Drop files here'
      : dropState === 'error'
      ? 'Some files were rejected'
      : disabled
      ? 'Connect a device to send files'
      : 'Drop files here or click to browse';

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Drop files here or press Enter to browse"
      aria-disabled={disabled}
      id={labelId}
      className={containerClass}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={openFilePicker}
      onKeyDown={onKeyDown}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={onInputChange}
        disabled={disabled}
      />

      {/* Icon */}
      <span className="text-4xl" aria-hidden="true">
        {icon}
      </span>

      {/* Heading */}
      <p className="text-center text-sm font-medium text-slate-200">
        {heading}
      </p>

      {/* Supported types */}
      {dropState !== 'error' && (
        <p className="text-center text-xs text-slate-400">
          {ALLOWED_TYPES_DISPLAY} · Max {MAX_FILE_SIZE_MB} MB per file
        </p>
      )}

      {/* Error messages */}
      {dropState === 'error' && errorMessages.length > 0 && (
        <ul className="w-full max-w-sm space-y-0.5" role="alert">
          {errorMessages.map((msg, i) => (
            <li
              key={i}
              className="truncate text-center text-xs text-danger"
              title={msg}
            >
              {msg}
            </li>
          ))}
        </ul>
      )}

      {/* Drag-over overlay highlight */}
      {dropState === 'dragover' && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl bg-primary/5"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
