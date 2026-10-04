import React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  success: 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30',
  danger:  'bg-red-500/20 text-red-400 ring-1 ring-red-500/30',
  info:    'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30',
  neutral: 'bg-slate-600/40 text-slate-300 ring-1 ring-slate-600/40',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Small status pill badge.
 * Variants: success (green), warning (yellow), danger (red), info (blue), neutral (slate).
 */
export default function Badge({
  variant = 'neutral',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        VARIANT_STYLES[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
