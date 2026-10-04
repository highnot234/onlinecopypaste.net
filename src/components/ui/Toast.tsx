'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const TYPE_STYLES: Record<ToastType, string> = {
  success: 'border-green-500/40 bg-slate-800 text-green-400',
  error:   'border-red-500/40 bg-slate-800 text-red-400',
  info:    'border-blue-500/40 bg-slate-800 text-blue-400',
  warning: 'border-yellow-500/40 bg-slate-800 text-yellow-400',
};

const TYPE_ICONS: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  warning: '⚠',
};

const DISMISS_AFTER_MS = 4000;
const MAX_TOASTS = 5;

// ---------------------------------------------------------------------------
// Single Toast item
// ---------------------------------------------------------------------------

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), DISMISS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={[
        'flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg',
        'max-w-sm w-full text-sm',
        'animate-in slide-in-from-right-5 fade-in duration-200',
        TYPE_STYLES[toast.type],
      ].join(' ')}
    >
      <span className="mt-0.5 shrink-0 font-bold" aria-hidden="true">
        {TYPE_ICONS[toast.type]}
      </span>
      <p className="flex-1 text-slate-200">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        ×
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Wrap your app with ToastProvider to enable toast notifications.
 * Access via useToast() hook.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      // Keep max 5 toasts — drop oldest if over limit
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-label="Notifications"
            className="fixed right-4 top-4 z-50 flex flex-col gap-2"
          >
            {toasts.map((toast) => (
              <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns { showToast } for displaying toast notifications.
 * Must be used inside a <ToastProvider>.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}
