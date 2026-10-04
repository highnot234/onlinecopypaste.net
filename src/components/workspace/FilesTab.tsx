'use client';

import React from 'react';
import type { TransferState } from '@/types/index';
import { DropZone } from '@/components/transfer/DropZone';
import { TransferProgress } from '@/components/transfer/TransferProgress';
import { FilePreview } from '@/components/transfer/FilePreview';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilesTabProps {
  send: (files: File[]) => void;
  transfers: TransferState[];
  onCancel: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Files tab with drag-and-drop upload, transfer list, and received file previews.
 */
export default function FilesTab({ send, transfers, onCancel }: FilesTabProps) {
  const active = transfers.filter(
    (t) => t.status === 'transferring' || t.status === 'pending',
  );
  const completed = transfers.filter(
    (t) => t.status === 'completed' && t.direction === 'receiving' && t.objectUrl,
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Drop zone */}
      <DropZone
        onFilesSelected={send}
        disabled={false}
      />

      {/* Active transfers */}
      {active.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-slate-400">Active Transfers</h3>
          {active.map((t) => (
            <TransferProgress key={t.transferId} transfer={t} onCancel={onCancel} />
          ))}
        </div>
      )}

      {/* All transfers (full list) */}
      {transfers.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-slate-400">
            All Transfers ({transfers.length})
          </h3>
          {transfers.map((t) => (
            <TransferProgress key={t.transferId} transfer={t} onCancel={onCancel} />
          ))}
        </div>
      )}

      {/* Received file previews */}
      {completed.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-slate-400">
            Received Files ({completed.length})
          </h3>
          {completed.map((t) => (
            <FilePreview
              key={t.transferId}
              file={{
                name: t.name,
                mimeType: t.mimeType,
                url: t.objectUrl ?? '',
              }}
            />
          ))}
        </div>
      )}

      {transfers.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-2">
          Drop files above to send them to the paired device.
        </p>
      )}
    </div>
  );
}
