import { ChevronDown, HelpCircle } from 'lucide-react';
import type { DetailsHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface ContextHelpProps extends Omit<DetailsHTMLAttributes<HTMLDetailsElement>, 'children'> {
  question?: ReactNode;
  children: ReactNode;
  tone?: 'neutral' | 'brand';
}

export function ContextHelp({
  question = 'Pourquoi cette information ?',
  children,
  tone = 'neutral',
  className,
  ...props
}: ContextHelpProps) {
  return (
    <details
      className={cn(
        'group rounded-[var(--sp-radius-control)] border',
        tone === 'brand'
          ? 'border-brand-200 bg-brand-50/70 dark:border-brand-900 dark:bg-brand-950/30'
          : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60',
        className,
      )}
      {...props}
    >
      <summary className="flex min-h-[var(--sp-touch-target)] cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 marker:hidden dark:text-slate-200 [&::-webkit-details-marker]:hidden">
        <HelpCircle aria-hidden="true" className="size-4 shrink-0" />
        <span className="min-w-0 flex-1">{question}</span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-current/10 px-3 py-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {children}
      </div>
    </details>
  );
}
