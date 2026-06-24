import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-sm',
        'dark:border-slate-800 dark:bg-slate-900/90',
        className,
      )}
      {...props}
    />
  );
}
