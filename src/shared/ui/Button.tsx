import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-700 text-white shadow-sm hover:bg-brand-800 disabled:bg-brand-700/50 dark:bg-brand-600 dark:hover:bg-brand-500',
  secondary:
    'border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
  ghost:
    'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
  danger:
    'bg-red-700 text-white shadow-sm hover:bg-red-800 disabled:bg-red-700/50',
  dangerGhost:
    'border border-red-200 bg-transparent text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    type = 'button',
    variant = 'primary',
    size = 'md',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-70',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
});
