'use client';

import React, { useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdSlotProps {
  slot: string;
  format?: string;
  style?: React.CSSProperties;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Google AdSense ad unit.
 * - Returns null if NEXT_PUBLIC_ADSENSE_ID is not set
 * - In dev with NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS=true, renders a placeholder div
 * - Otherwise renders an <ins class="adsbygoogle"> and pushes to adsbygoogle[]
 */
export default function AdSlot({
  slot,
  format = 'auto',
  style,
  className = '',
}: AdSlotProps) {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;
  const showPlaceholders = process.env.NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS === 'true';

  useEffect(() => {
    if (!adsenseId) return;
    try {
      const adsbygoogle = (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle;
      ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = adsbygoogle ?? []).push({});
    } catch {
      // AdSense not loaded yet — ignore
    }
  }, [adsenseId]);

  // No publisher ID configured — don't render anything in production
  if (!adsenseId) {
    if (showPlaceholders) {
      return (
        <div
          className={[
            'flex items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-800/40 text-xs text-slate-500',
            className,
          ].join(' ')}
          style={{ minHeight: 90, ...style }}
          aria-hidden="true"
          role="presentation"
        >
          Ad Placeholder
        </div>
      );
    }
    return null;
  }

  return (
    <div className={className} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client={adsenseId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
