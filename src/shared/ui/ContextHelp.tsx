import { ChevronDown, HelpCircle } from 'lucide-react';
import type { DetailsHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface ContextHelpProps extends Omit<DetailsHTMLAttributes<HTMLDetailsElement>, 'children'> {
  question?: ReactNode;
  children: ReactNode;
  tone?: 'neutral' | 'brand';
  iconOnly?: boolean;
}

export function ContextHelp({
  question = 'Pourquoi cette information ?',
  children,
  tone = 'neutral',
  iconOnly = false,
  className,
  ...props
}: ContextHelpProps) {
  return (
    <details
      className={cn(
        'group rounded-[var(--sp-radius-control)] border',
        iconOnly && 'relative border-0',
        tone === 'brand'
          ? 'border-brand-200 bg-brand-50/70 dark:border-brand-900 dark:bg-brand-950/30'
          : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60',
        className,
      )}
      {...props}
    >
      <summary
        role="button"
        aria-label={iconOnly && typeof question === 'string' ? question : undefined}
        title={iconOnly && typeof question === 'string' ? question : undefined}
        className={cn(
          'flex min-h-[var(--sp-touch-target)] cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 marker:hidden dark:text-slate-200 [&::-webkit-details-marker]:hidden',
          iconOnly && 'size-[var(--sp-touch-target)] justify-center rounded-xl p-0 hover:bg-slate-100 dark:hover:bg-slate-800',
        )}
      >
        <HelpCircle aria-hidden="true" className="size-4 shrink-0" />
        <span className={iconOnly ? 'sr-only' : 'min-w-0 flex-1'}>{question}</span>
        {iconOnly ? null : (
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180" />
        )}
      </summary>
      <div className={cn(
        'border-t border-current/10 px-3 py-3 text-sm leading-6 text-slate-600 dark:text-slate-300',
        iconOnly
          && 'absolute right-0 top-full z-30 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900',
      )}>
        {children}
      </div>
    </details>
  );
}
