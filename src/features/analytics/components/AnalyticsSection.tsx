import { ChevronDown, type LucideIcon } from 'lucide-react';
import { useId, useState, type PropsWithChildren } from 'react';
import { Card } from '@/shared/ui/Card';
import { cn } from '@/shared/utils/cn';

interface AnalyticsSectionProps extends PropsWithChildren {
  title: string;
  description: string;
  summary: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  toneClassName?: string;
}

export function AnalyticsSection({
  title,
  description,
  summary,
  icon: Icon,
  defaultOpen = false,
  toneClassName = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  children,
}: AnalyticsSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="flex min-h-18 w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-none sm:px-5"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', toneClassName)}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-slate-950 dark:text-white">{title}</span>
          <span className="mt-0.5 block text-sm leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="hidden text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200 sm:block">
            {summary}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-5 text-slate-500 transition-transform duration-200 motion-reduce:transition-none',
              open && 'rotate-180',
            )}
          />
        </span>
      </button>
      {open ? (
        <div id={contentId} className="border-t border-slate-200 p-4 dark:border-slate-800 sm:p-5">
          {children}
        </div>
      ) : null}
    </Card>
  );
}
