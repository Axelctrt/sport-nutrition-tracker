import { CalendarDays } from 'lucide-react';
import type { LocalDate } from '@/domain/models/common';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';
import { cn } from '@/shared/utils/cn';
import { relativeDateLabel } from '@/shared/utils/relativeDateLabel';

interface DateContextBannerProps {
  date: LocalDate;
  onReturnToday: () => void;
  className?: string;
}

export function DateContextBanner({
  date,
  onReturnToday,
  className,
}: DateContextBannerProps) {
  const today = toLocalDate();
  if (date === today) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
      role="status"
    >
      <p className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-brand-700 dark:text-brand-300" />
        <span className="break-words">
          Journée du {formatLocalDate(date, 'd MMMM')}
          <span className="sr-only"> ({relativeDateLabel(date, today)})</span>
        </span>
      </p>
      <button
        type="button"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
        onClick={onReturnToday}
      >
        Revenir à aujourd’hui
      </button>
    </div>
  );
}
