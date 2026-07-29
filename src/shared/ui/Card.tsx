import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export type CardVariant = 'default' | 'muted' | 'elevated' | 'interactive';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'sp-card',
  muted: 'sp-card sp-card--muted',
  elevated: 'sp-card sp-card--elevated',
  interactive: 'sp-card sp-card--interactive',
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
        variantClasses[variant],
        paddingClasses[padding],
        className,
      )}
      {...props}
    />
  );
}
