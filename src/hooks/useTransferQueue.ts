'use client';

import { useState, useCallback, useRef } from 'react';
import type { TransferState, TransferStatus, FileMeta } from '@/types/index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseTransferQueueResult {
  transfers: Map<string, TransferState>;
  enqueue: (file: File, sendFn: (file: File, transferId: string) => Promise<void>) => void;
  updateProgress: (transferId: string, bytesTransferred: number) => void;
  complete: (transferId: string) => void;
  cancel: (transferId: string, cancelFn?: (transferId: string) => void) => void;
  receiveFileMeta: (meta: FileMeta) => void;
  receiveChunk: (transferId: string, receivedChunks: number, totalChunks: number) => void;
  receiveComplete: (transferId: string, objectUrl: string, meta: FileMeta) => void;
  activeCount: number;
}

// ---------------------------------------------------------------------------
// UUID v4 — inline to avoid async import in callback
// ---------------------------------------------------------------------------

function uuidv4(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the queue of pending/active/completed file transfers.
 *
 * Transfers flow through these states:
 *   pending → transferring → completed
 *                          ↘ failed
 *                          ↘ cancelled
 *
 * Outgoing transfers: enqueue() generates a transferId, adds to state,
 * calls sendFn(file, transferId) which drives the DataChannel send.
 *
 * Incoming transfers: receiveFileMeta() registers the transfer,
 * receiveChunk() updates progress, receiveComplete() sets objectUrl + completed.
 */
export function useTransferQueue(): UseTransferQueueResult {
  // Using a Map stored in state so consumers can iterate or look up by id.
  // We store a copy of the Map on each update to trigger re-renders.
  const [transfers, setTransfers] = useState<Map<string, TransferState>>(new Map());

  // Mutable ref mirrors the state for use inside callbacks without closures
  const transfersRef = useRef<Map<string, TransferState>>(new Map());

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  const updateState = useCallback((next: Map<string, TransferState>) => {
    transfersRef.current = next;
    setTransfers(new Map(next));
  }, []);

  const updateTransfer = useCallback(
    (transferId: string, patch: Partial<TransferState>) => {
      const current = transfersRef.current.get(transferId);
      if (!current) return;
      const next = new Map(transfersRef.current);
      next.set(transferId, { ...current, ...patch });
      updateState(next);
    },
    [updateState],
  );

  // ---------------------------------------------------------------------------
  // enqueue — outgoing transfer
  // ---------------------------------------------------------------------------

  const enqueue = useCallback(
    (file: File, sendFn: (file: File, transferId: string) => Promise<void>) => {
      const transferId = uuidv4();
      const totalChunks = Math.ceil(file.size / 65_536);

      const newTransfer: TransferState = {
        transferId,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        totalChunks,
        receivedChunks: 0,
        status: 'pending',
        progress: 0,
        direction: 'sending',
        startedAt: new Date(),
      };

      const next = new Map(transfersRef.current);
      next.set(transferId, newTransfer);
      updateState(next);

      // Start sending — status → transferring
      updateTransfer(transferId, { status: 'transferring' });

      sendFn(file, transferId).catch(() => {
        updateTransfer(transferId, { status: 'failed', completedAt: new Date() });
      });
    },
    [updateState, updateTransfer],
  );

  // ---------------------------------------------------------------------------
  // updateProgress — called during outgoing transfer
  // ---------------------------------------------------------------------------

  const updateProgress = useCallback(
    (transferId: string, bytesTransferred: number) => {
      const current = transfersRef.current.get(transferId);
      if (!current) return;
      const progress = current.size > 0
        ? Math.min(100, Math.round((bytesTransferred / current.size) * 100))
        : 0;
      updateTransfer(transferId, { progress, status: 'transferring' });
    },
    [updateTransfer],
  );

  // ---------------------------------------------------------------------------
  // complete — outgoing transfer finished
  // ---------------------------------------------------------------------------

  const complete = useCallback(
    (transferId: string) => {
      updateTransfer(transferId, {
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
      });
    },
    [updateTransfer],
  );

  // ---------------------------------------------------------------------------
  // cancel
  // ---------------------------------------------------------------------------

  const cancel = useCallback(
    (transferId: string, cancelFn?: (transferId: string) => void) => {
      updateTransfer(transferId, {
        status: 'cancelled',
        completedAt: new Date(),
      });
      cancelFn?.(transferId);
    },
    [updateTransfer],
  );

  // ---------------------------------------------------------------------------
  // receiveFileMeta — incoming transfer starts
  // ---------------------------------------------------------------------------

  const receiveFileMeta = useCallback(
    (meta: FileMeta) => {
      const newTransfer: TransferState = {
        transferId: meta.transferId,
        name: meta.name,
        size: meta.size,
        mimeType: meta.mimeType,
        totalChunks: meta.totalChunks,
        receivedChunks: 0,
        status: 'transferring',
        progress: 0,
        direction: 'receiving',
        startedAt: new Date(),
      };
      const next = new Map(transfersRef.current);
      next.set(meta.transferId, newTransfer);
      updateState(next);
    },
    [updateState],
  );

  // ---------------------------------------------------------------------------
  // receiveChunk — update receive progress
  // ---------------------------------------------------------------------------

  const receiveChunk = useCallback(
    (transferId: string, receivedChunks: number, totalChunks: number) => {
      const progress = totalChunks > 0
        ? Math.min(100, Math.round((receivedChunks / totalChunks) * 100))
        : 0;
      updateTransfer(transferId, {
        receivedChunks,
        progress,
        status: progress === 100 ? 'completed' : 'transferring',
      });
    },
    [updateTransfer],
  );

  // ---------------------------------------------------------------------------
  // receiveComplete — file assembled, objectUrl available
  // ---------------------------------------------------------------------------

  const receiveComplete = useCallback(
    (transferId: string, objectUrl: string, meta: FileMeta) => {
      updateTransfer(transferId, {
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
        objectUrl,
        name: meta.name,
        mimeType: meta.mimeType,
        size: meta.size,
        totalChunks: meta.totalChunks,
        receivedChunks: meta.totalChunks,
      });
    },
    [updateTransfer],
  );

  // ---------------------------------------------------------------------------
  // activeCount
  // ---------------------------------------------------------------------------

  const activeCount = Array.from(transfersRef.current.values()).filter(
    (t) => t.status === 'transferring' || t.status === 'pending',
  ).length;

  return {
    transfers,
    enqueue,
    updateProgress,
    complete,
    cancel,
    receiveFileMeta,
    receiveChunk,
    receiveComplete,
    activeCount,
  };
}
