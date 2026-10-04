// Google Analytics 4 (gtag) helpers.
// Browser-only — never imported from server.ts.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Send a custom event to GA4 if the measurement ID is configured and gtag is
 * available. Silently no-ops in all other cases (dev, missing ID, SSR, etc.).
 */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return;
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', name, params ?? {});
}

// ---------------------------------------------------------------------------
// Specific event helpers
// ---------------------------------------------------------------------------

export function trackSessionCreated(): void {
  trackEvent('session_created');
}

export function trackSessionDestroyed(): void {
  trackEvent('session_destroyed');
}

export function trackFileTransfer(bytes: number): void {
  trackEvent('file_transfer', { bytes });
}

export function trackPaired(): void {
  trackEvent('devices_paired');
}
