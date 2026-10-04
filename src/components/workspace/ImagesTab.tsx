'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReceivedImage {
  url: string;
  name: string;
}

export interface ImagesTabProps {
  send: (files: File[]) => void;
  received: ReceivedImage[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Images tab — image-specific drop zone and received image grid.
 * Click any thumbnail to enlarge in a Modal.
 */
export default function ImagesTab({ send, received }: ImagesTabProps) {
  const [enlarged, setEnlarged] = useState<ReceivedImage | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      send(files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/'),
    );
    if (files.length > 0) send(files);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Image drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/60 p-6 hover:border-primary/60 transition-colors"
      >
        <span className="text-4xl" aria-hidden="true">🖼️</span>
        <p className="text-sm text-slate-300">Drop images here or click to browse</p>
        <p className="text-xs text-slate-500">PNG, JPG, GIF, WebP, SVG</p>
        <label className="cursor-pointer rounded-md bg-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 transition-colors">
          Browse Images
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={handleFileChange}
          />
        </label>
      </div>

      {/* Received images grid */}
      {received.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-slate-400">
            Received Images ({received.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {received.map((img, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-lg border border-slate-700 bg-slate-900 aspect-square cursor-pointer"
                onClick={() => setEnlarged(img)}
                onKeyDown={(e) => e.key === 'Enter' && setEnlarged(img)}
                role="button"
                tabIndex={0}
                aria-label={`View ${img.name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm font-medium text-white">View</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {received.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-2">
          No images received yet.
        </p>
      )}

      {/* Enlarged modal */}
      {enlarged && (
        <Modal
          isOpen={!!enlarged}
          onClose={() => setEnlarged(null)}
          title={enlarged.name}
          size="lg"
        >
          <div className="flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enlarged.url}
              alt={enlarged.name}
              className="w-full rounded-lg object-contain max-h-[60vh]"
            />
            <a
              href={enlarged.url}
              download={enlarged.name}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              ↓ Download
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}
