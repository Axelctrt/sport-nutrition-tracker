import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export type CardVariant = 'default' | 'muted' | 'elevated' | 'interactive';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
}

const variantClasses: Record<CardVariant, string> = {
  default:
    'border-slate-200/80 bg-white/90 shadow-[var(--sp-shadow-card)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90',
  muted:
    'border-slate-200 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-900/60',
  elevated:
    'border-slate-200/70 bg-white shadow-lg shadow-slate-950/8 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20',
  interactive:
    'border-slate-200/80 bg-white/90 shadow-[var(--sp-shadow-card)] transition-[border-color,box-shadow,transform] hover:border-brand-300 hover:shadow-md active:translate-y-px dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-brand-700',
};

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

export function Card({
  className,
  variant = 'default',
  padding = 'none',
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--sp-radius-card)] border',
        variantClasses[variant],
        paddingClasses[padding],
        className,
      )}
      {...props}
    />
  );
}
