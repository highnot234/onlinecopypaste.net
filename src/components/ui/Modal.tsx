'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: ModalSize;
}

// ---------------------------------------------------------------------------
// Size styles
// ---------------------------------------------------------------------------

const SIZE_STYLES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Accessible modal dialog.
 * - Rendered at document.body via createPortal
 * - Traps focus while open
 * - Closes on Escape key or backdrop click
 * - Close (X) button in top-right corner
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Trap focus inside modal when open
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      // Focus first focusable element after portal renders
      const timer = setTimeout(() => {
        panelRef.current
          ?.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          )
          ?.focus();
      }, 10);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the element that opened the modal
      previousFocusRef.current?.focus();
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={[
          'relative w-full rounded-xl border border-slate-700 bg-slate-800 shadow-2xl',
          SIZE_STYLES[size],
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <h2
            id="modal-title"
            className="text-base font-semibold text-slate-100"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
