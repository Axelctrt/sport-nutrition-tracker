import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, parseISO } from 'date-fns';
import type { LocalDate } from '@/domain/models/common';
import { IconAction } from '@/shared/ui/IconAction';
import { cn } from '@/shared/utils/cn';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';
import { DateContextBanner } from '@/shared/ui/DateContextBanner';

interface FoodJournalDateNavigatorProps {
  date: LocalDate;
  onChange: (date: LocalDate) => void;
  className?: string;
}

function offsetLocalDate(date: LocalDate, amount: number): LocalDate {
  return toLocalDate(addDays(parseISO(date), amount));
}

export function FoodJournalDateNavigator({
  date,
  onChange,
  className,
}: FoodJournalDateNavigatorProps) {
  const today = toLocalDate();
  const isToday = date === today;

  return (
    <div className={className}>
      {!isToday ? (
        <DateContextBanner
          date={date}
          className="mb-2"
          onReturnToday={() => onChange(today)}
        />
      ) : null}
      <div
        className={cn(
          'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900',
        )}
        aria-label="Navigation entre les journées"
      >
        <IconAction
          icon={ChevronLeft}
          label="Jour précédent"
          variant="ghost"
          onClick={() => onChange(offsetLocalDate(date, -1))}
        />

      <label className="relative min-w-0 cursor-pointer rounded-xl px-2 py-1 text-center hover:bg-slate-50 dark:hover:bg-slate-800">
        <span className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-brand-700 dark:text-brand-300" />
          <span className="truncate">
            {isToday ? "Aujourd'hui" : formatLocalDate(date, 'EEEE d MMMM')}
          </span>
        </span>
        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
          {formatLocalDate(date)}
        </span>
        <input
          aria-label="Choisir une date"
          type="date"
          value={date}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>

        <IconAction
          icon={ChevronRight}
          label="Jour suivant"
          variant="ghost"
          onClick={() => onChange(offsetLocalDate(date, 1))}
        />
      </div>
    </div>
  );
}
