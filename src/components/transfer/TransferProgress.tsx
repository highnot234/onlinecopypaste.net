'use client';

import React from 'react';
import type { TransferState } from '@/types/index';
import { formatFileSize } from '@/lib/file-utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TransferProgressProps {
  transfer: TransferState;
  onCancel: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  pending: 'Queued',
  transferring: 'Transferring',
  completed: 'Complete',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-600 text-slate-200',
  transferring: 'bg-primary text-white',
  completed: 'bg-success text-white',
  failed: 'bg-danger text-white',
  cancelled: 'bg-slate-600 text-slate-200',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a single transfer item:
 * - Filename + size
 * - Animated progress bar (percentage)
 * - Transfer direction badge
 * - Status badge
 * - Cancel button (if sending and in progress)
 * - Download button (if received and completed)
 */
export function TransferProgress({ transfer, onCancel }: TransferProgressProps) {
  const {
    transferId,
    name,
    size,
    progress,
    status,
    direction,
    objectUrl,
  } = transfer;

  const isActive = status === 'transferring' || status === 'pending';
  const canCancel = isActive && direction === 'sending';
  const canDownload = status === 'completed' && direction === 'receiving' && objectUrl;

  const statusLabel = STATUS_LABELS[status] ?? status;
  const statusColor = STATUS_COLORS[status] ?? 'bg-slate-600 text-slate-200';
  const directionLabel = direction === 'sending' ? '↑ Sending' : '↓ Receiving';

  return (
    <div
      className="transfer-progress flex flex-col gap-2 rounded-lg border border-slate-700 bg-slate-800 p-3"
      role="status"
      aria-label={`Transfer: ${name}, ${statusLabel}, ${progress}%`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-medium text-slate-100"
            title={name}
          >
            {name}
          </p>
          <p className="text-xs text-slate-400">{formatFileSize(size)}</p>
        </div>

        {/* Badges */}
        <div className="flex shrink-0 flex-wrap gap-1">
          <span className="rounded px-1.5 py-0.5 text-xs text-slate-300 bg-slate-700">
            {directionLabel}
          </span>
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${progress}% transferred`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            status === 'completed'
              ? 'bg-success'
              : status === 'failed' || status === 'cancelled'
              ? 'bg-danger'
              : 'bg-primary'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Percentage text */}
      {isActive && (
        <p className="text-xs text-slate-400">{progress}% complete</p>
      )}

      {/* Action buttons */}
      {(canCancel || canDownload) && (
        <div className="flex gap-2">
          {canCancel && (
            <button
              type="button"
              onClick={() => onCancel(transferId)}
              className="rounded bg-slate-700 px-3 py-1 text-xs text-slate-200 transition-colors hover:bg-danger hover:text-white focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2 focus:ring-offset-slate-800"
              aria-label={`Cancel transfer of ${name}`}
            >
              Cancel
            </button>
          )}

          {canDownload && objectUrl && (
            <a
              href={objectUrl}
              download={name}
              className="inline-flex items-center gap-1 rounded bg-success px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2 focus:ring-offset-slate-800"
              aria-label={`Download ${name}`}
            >
              ↓ Download
            </a>
          )}
        </div>
      )}
    </div>
  );
}
