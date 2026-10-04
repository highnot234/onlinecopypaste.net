'use client';

import React from 'react';
import type { TransferState } from '@/types/index';
import { TransferProgress } from '@/components/transfer/TransferProgress';
import Button from '@/components/ui/Button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransfersTabProps {
  transfers: TransferState[];
  onCancel: (id: string) => void;
  onClearCompleted?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Complete transfer history tab — pending, active, completed, failed.
 * Each item uses TransferProgress. 'Clear Completed' button at top.
 */
export default function TransfersTab({
  transfers,
  onCancel,
  onClearCompleted,
}: TransfersTabProps) {
  const completedCount = transfers.filter(
    (t) => t.status === 'completed' || t.status === 'cancelled',
  ).length;

  if (transfers.length === 0) {
    return (
      <p className="text-center text-sm text-slate-500 py-8">
        No transfers yet. Use the Files or Images tabs to send files.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Actions row */}
      {completedCount > 0 && onClearCompleted && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClearCompleted}>
            Clear Completed ({completedCount})
          </Button>
        </div>
      )}

      {/* Transfer list */}
      <ul className="flex flex-col gap-2" aria-label="Transfer list">
        {transfers.map((t) => (
          <li key={t.transferId}>
            <TransferProgress transfer={t} onCancel={onCancel} />
          </li>
        ))}
      </ul>
    </div>
  );
}
