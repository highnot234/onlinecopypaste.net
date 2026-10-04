'use client';

import React, { useState } from 'react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import type { ConnectionMode } from '@/types/index';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const MODE_STYLES: Record<ConnectionMode, string> = {
  online:  'bg-green-500/20 text-green-400 ring-1 ring-green-500/30',
  local:   'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30',
  offline: 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30',
};

const MODE_DOTS: Record<ConnectionMode, string> = {
  online:  'bg-green-400',
  local:   'bg-yellow-400',
  offline: 'bg-red-400',
};

const MODE_LABELS: Record<ConnectionMode, string> = {
  online:  'ONLINE',
  local:   'LOCAL',
  offline: 'OFFLINE',
};

const MODE_TOOLTIPS: Record<ConnectionMode, string> = {
  online:
    'You are connected to the internet and the signaling server. P2P transfers are encrypted end-to-end.',
  local:
    'You are on a local network only. P2P transfers may still work if both devices are on the same Wi-Fi/LAN. Internet signaling is unavailable.',
  offline:
    'No network connection detected. Transfer between devices requires at least a shared local network.',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Small indicator badge showing ONLINE, LOCAL, or OFFLINE mode.
 * Tooltip on hover explains what each mode means.
 */
export default function ConnectionStatus() {
  const { mode } = useConnectionStatus();
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        aria-label={`Connection mode: ${MODE_LABELS[mode]}`}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        onFocus={() => setShowTip(true)}
        onBlur={() => setShowTip(false)}
        className={[
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-default',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          MODE_STYLES[mode],
        ].join(' ')}
      >
        {/* Animated dot */}
        <span
          className={[
            'inline-block h-1.5 w-1.5 rounded-full',
            mode === 'online' ? 'animate-pulse' : '',
            MODE_DOTS[mode],
          ].join(' ')}
          aria-hidden="true"
        />
        {MODE_LABELS[mode]}
      </button>

      {/* Tooltip */}
      {showTip && (
        <div
          role="tooltip"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 shadow-xl"
        >
          {MODE_TOOLTIPS[mode]}
        </div>
      )}
    </div>
  );
}
