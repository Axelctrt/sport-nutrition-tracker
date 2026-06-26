import { ChevronDown } from 'lucide-react';
import type { PropsWithChildren, ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface CollapsibleSectionProps extends PropsWithChildren {
  title: string;
  description?: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function CollapsibleSection({
  title,
  description,
  summary,
  defaultOpen = false,
  className,
  children,
}: CollapsibleSectionProps) {
  return (
    <details
      className={cn(
        'group rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90',
        className,
      )}
      open={defaultOpen || undefined}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-4 py-3 focus-visible:outline-none sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block font-semibold text-slate-950 dark:text-white">{title}</span>
          {description ? (
            <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{description}</span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          {summary}
          <ChevronDown
            aria-hidden="true"
            className="size-5 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          />
        </span>
      </summary>
      <div className="border-t border-slate-200/80 px-4 py-5 dark:border-slate-800 sm:px-5">
        {children}
      </div>
    </details>
  );
}
