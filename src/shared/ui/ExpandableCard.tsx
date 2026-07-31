import { ChevronDown } from 'lucide-react';
import { useId, type ReactNode } from 'react';

import { Card } from '@/shared/ui/Card';
import { cn } from '@/shared/utils/cn';

interface ExpandableCardProps {
  summary: ReactNode;
  actions?: ReactNode;
  details?: ReactNode;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  expandLabel: string;
  collapseLabel: string;
  className?: string;
  summaryClassName?: string;
  detailsClassName?: string;
}

export function ExpandableCard({
  summary,
  actions,
  details,
  expanded,
  onExpandedChange,
  expandLabel,
  collapseLabel,
  className,
  summaryClassName,
  detailsClassName,
}: ExpandableCardProps) {
  const reactId = useId();
  const summaryId = `${reactId}-summary`;
  const detailsId = `${reactId}-details`;
  const hasDetails = details !== undefined && details !== null;

  return (
    <Card className={cn('p-4 sm:p-5', className)}>
      <div className="flex items-start gap-3">
        <div id={summaryId} className={cn('min-w-0 flex-1', summaryClassName)}>
          {summary}
        </div>

        {actions || hasDetails ? (
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            {hasDetails ? (
              <button
                type="button"
                aria-controls={detailsId}
                aria-expanded={expanded}
                aria-label={expanded ? collapseLabel : expandLabel}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                onClick={() => onExpandedChange(!expanded)}
              >
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'size-5 transition-transform duration-200 motion-reduce:transition-none',
                    expanded && 'rotate-180',
                  )}
                />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {hasDetails && expanded ? (
        <div
          id={detailsId}
          role="region"
          aria-labelledby={summaryId}
          className={cn('mt-4 border-t border-slate-200 pt-4 dark:border-slate-800', detailsClassName)}
        >
          {details}
        </div>
      ) : null}
    </Card>
  );
}
