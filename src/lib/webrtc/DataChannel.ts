// Browser-only — do NOT import this file from server.ts or any file included
// by tsconfig.server.json.

import type { FileMeta, TransferStatus, ContentType } from '@/types/index';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum chunk size for binary DataChannel messages (64 KB). */
const CHUNK_SIZE = 65_536;

/**
 * Header layout for binary file chunks:
 * - Bytes  0–15: transferId as 16 ASCII hex characters (first 16 chars of UUID v4 without dashes)
 * - Bytes 16–19: chunkIndex as big-endian uint32
 */
const HEADER_SIZE = 20;

/** Pause sending when the buffer exceeds 16 MB. */
const BUFFER_HIGH_WATERMARK = 16 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProgressEvent {
  transferId: string;
  receivedChunks: number;
  totalChunks: number;
  progress: number; // 0–100
  status: TransferStatus;
}

export type OnProgressCallback = (event: ProgressEvent) => void;
export type OnFileReadyCallback = (transferId: string, blob: Blob, meta: FileMeta) => void;
export type OnTextCallback = (content: string, contentType: ContentType) => void;

// ---------------------------------------------------------------------------
// In-flight transfer state
// ---------------------------------------------------------------------------

interface InFlightTransfer {
  meta: FileMeta;
  chunks: ArrayBuffer[];
  receivedCount: number;
}

// ---------------------------------------------------------------------------
// DataChannelManager
// ---------------------------------------------------------------------------

/**
 * Manages text and binary file transfers over a single RTCDataChannel.
 *
 * Sending flow:
 *   1. sendFileMeta() — sends JSON metadata message
 *   2. sendChunks()   — called internally, sends binary chunks with backpressure
 *
 * Receiving flow:
 *   1. Incoming JSON message with type 'file-meta' → registers InFlightTransfer
 *   2. Incoming binary message → receiveChunk() → when complete, assembleFile()
 */
export class DataChannelManager {
  private channel: RTCDataChannel | null = null;
  private inFlight: Map<string, InFlightTransfer> = new Map();

  private onProgress: OnProgressCallback;
  private onFileReady: OnFileReadyCallback;
  private onText: OnTextCallback;

  constructor(
    onProgress: OnProgressCallback,
    onFileReady: OnFileReadyCallback,
    onText: OnTextCallback,
  ) {
    this.onProgress = onProgress;
    this.onFileReady = onFileReady;
    this.onText = onText;
  }

  /**
   * Attach a DataChannel to this manager and register event handlers.
   */
  openChannel(channel: RTCDataChannel): void {
    this.channel = channel;
    channel.binaryType = 'arraybuffer';

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        this._handleJsonMessage(event.data);
      } else if (event.data instanceof ArrayBuffer) {
        this._receiveChunk(event.data);
      }
    };
  }

  /**
   * Send a plain-text or code message to the peer.
   */
  sendText(content: string, type: ContentType): void {
    if (!this.channel || this.channel.readyState !== 'open') return;
    const message = JSON.stringify({ type: 'text', contentType: type, content });
    this.channel.send(message);
  }

  /**
   * Send file metadata to the peer (step 1 of file transfer).
   * Immediately starts streaming chunks after metadata is sent.
   */
  async sendFileMeta(file: File, transferId: string): Promise<void> {
    if (!this.channel || this.channel.readyState !== 'open') return;

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const meta: FileMeta = {
      transferId,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      totalChunks,
    };

    this.channel.send(JSON.stringify({ type: 'file-meta', ...meta }));
    await this._sendChunks(file, transferId, totalChunks);
  }

  /**
   * Send a cancellation notice for an in-progress transfer.
   */
  cancelTransfer(transferId: string): void {
    if (!this.channel || this.channel.readyState !== 'open') return;
    this.channel.send(JSON.stringify({ type: 'file-cancel', transferId }));
    this.inFlight.delete(transferId);
  }

  // ---------------------------------------------------------------------------
  // Private — sending
  // ---------------------------------------------------------------------------

  private async _sendChunks(file: File, transferId: string, totalChunks: number): Promise<void> {
    if (!this.channel) return;

    // Build a 16-char ASCII hex prefix from the transferId (remove dashes, take first 16 chars)
    const idPrefix = transferId.replace(/-/g, '').slice(0, 16);

    for (let i = 0; i < totalChunks; i++) {
      // Backpressure: pause if the buffer is too full
      while (this.channel.bufferedAmount > BUFFER_HIGH_WATERMARK) {
        await this._waitForDrain();
      }

      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunkData = await file.slice(start, end).arrayBuffer();

      const headerAndChunk = new ArrayBuffer(HEADER_SIZE + chunkData.byteLength);
      const view = new DataView(headerAndChunk);

      // Write 16-byte transferId prefix as ASCII codes
      for (let b = 0; b < 16; b++) {
        view.setUint8(b, idPrefix.charCodeAt(b));
      }
      // Write 4-byte chunk index (big-endian uint32)
      view.setUint32(16, i, false);

      // Copy chunk data after header
      new Uint8Array(headerAndChunk, HEADER_SIZE).set(new Uint8Array(chunkData));

      this.channel.send(headerAndChunk);

      this.onProgress({
        transferId,
        receivedChunks: i + 1,
        totalChunks,
        progress: Math.round(((i + 1) / totalChunks) * 100),
        status: i + 1 === totalChunks ? 'completed' : 'transferring',
      });
    }

    // Signal completion to the receiver
    if (this.channel.readyState === 'open') {
      this.channel.send(JSON.stringify({ type: 'file-complete', transferId }));
    }
  }

  private _waitForDrain(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.channel) {
        resolve();
        return;
      }
      const handler = () => {
        this.channel!.removeEventListener('bufferedamountlow', handler);
        resolve();
      };
      this.channel.addEventListener('bufferedamountlow', handler);
    });
  }

  // ---------------------------------------------------------------------------
  // Private — receiving
  // ---------------------------------------------------------------------------

  private _handleJsonMessage(data: string): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return;
    }

    const msgType = msg.type as string;

    if (msgType === 'text') {
      this.onText(msg.content as string, msg.contentType as ContentType);
      return;
    }

    if (msgType === 'file-meta') {
      const meta: FileMeta = {
        transferId: msg.transferId as string,
        name: msg.name as string,
        size: msg.size as number,
        mimeType: msg.mimeType as string,
        totalChunks: msg.totalChunks as number,
      };
      this.inFlight.set(meta.transferId, {
        meta,
        chunks: new Array(meta.totalChunks),
        receivedCount: 0,
      });
      return;
    }

    if (msgType === 'file-complete') {
      const transferId = msg.transferId as string;
      this._assembleFile(transferId);
      return;
    }

    if (msgType === 'file-cancel') {
      const transferId = msg.transferId as string;
      this.inFlight.delete(transferId);
      this.onProgress({
        transferId,
        receivedChunks: 0,
        totalChunks: 0,
        progress: 0,
        status: 'cancelled',
      });
      return;
    }
  }

  private _receiveChunk(buffer: ArrayBuffer): void {
    if (buffer.byteLength < HEADER_SIZE) return;

    const view = new DataView(buffer);

    // Read 16-byte transferId prefix
    let idPrefix = '';
    for (let b = 0; b < 16; b++) {
      idPrefix += String.fromCharCode(view.getUint8(b));
    }
    const chunkIndex = view.getUint32(16, false);
    const chunkData = buffer.slice(HEADER_SIZE);

    // Match by prefix to an in-flight transfer
    const transfer = this._findByPrefix(idPrefix);
    if (!transfer) return;

    transfer.chunks[chunkIndex] = chunkData;
    transfer.receivedCount++;

    this.onProgress({
      transferId: transfer.meta.transferId,
      receivedChunks: transfer.receivedCount,
      totalChunks: transfer.meta.totalChunks,
      progress: Math.round((transfer.receivedCount / transfer.meta.totalChunks) * 100),
      status: transfer.receivedCount === transfer.meta.totalChunks ? 'completed' : 'transferring',
    });
  }

  private _assembleFile(transferId: string): void {
    const transfer = this.inFlight.get(transferId);
    if (!transfer) return;

    const blob = new Blob(transfer.chunks, { type: transfer.meta.mimeType });
    this.inFlight.delete(transferId);
    this.onFileReady(transferId, blob, transfer.meta);
  }

  private _findByPrefix(prefix: string): InFlightTransfer | undefined {
    for (const [, transfer] of this.inFlight) {
      const transferPrefix = transfer.meta.transferId.replace(/-/g, '').slice(0, 16);
      if (transferPrefix === prefix) return transfer;
    }
    return undefined;
  }
}
