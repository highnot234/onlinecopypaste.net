import React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'danger' | 'ghost' | 'secondary';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-indigo-500 focus-visible:ring-primary disabled:bg-indigo-900 disabled:text-indigo-400',
  danger:
    'bg-danger text-white hover:bg-red-500 focus-visible:ring-danger disabled:bg-red-900 disabled:text-red-400',
  ghost:
    'bg-transparent text-slate-300 hover:bg-slate-700 hover:text-slate-100 focus-visible:ring-slate-500 disabled:text-slate-600',
  secondary:
    'bg-slate-700 text-slate-200 hover:bg-slate-600 focus-visible:ring-slate-500 disabled:bg-slate-800 disabled:text-slate-500',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner({ size }: { size: ButtonSize }) {
  const dim = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <svg
      className={`${dim} animate-spin`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Polymorphic button with variants: primary, danger, ghost, secondary.
 * Sizes: sm, md, lg. Supports loading spinner and disabled state.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center rounded-md font-medium',
        'transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
        'disabled:cursor-not-allowed',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      ].join(' ')}
      {...props}
    >
      {loading && <Spinner size={size} />}
      {children}
    </button>
  );
}
