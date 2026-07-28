import { LoaderCircle } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'sp-button',
  secondary: 'sp-button sp-button--secondary',
  ghost: 'sp-button sp-button--ghost',
  danger:
    'bg-red-700 text-white shadow-sm hover:bg-red-800 disabled:bg-red-700/50',
  dangerGhost:
    'border border-red-200 bg-transparent text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-[var(--sp-control-height-sm)] px-3 text-sm',
  md: 'min-h-[var(--sp-control-height-md)] px-4 text-sm',
  lg: 'min-h-[var(--sp-control-height-lg)] px-5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    type = 'button',
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingLabel,
    fullWidth = false,
    disabled,
    ...props
  },
  ref,
) {
  const content = loading && loadingLabel ? loadingLabel : children;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--sp-radius-control)] font-semibold',
        'disabled:cursor-not-allowed disabled:opacity-70',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <LoaderCircle aria-hidden="true" className="size-4 shrink-0 motion-safe:animate-spin motion-reduce:animate-none" />
      ) : null}
      {content}
    </button>
  );
});
