import { addDays } from 'date-fns';
import { CalendarRange } from 'lucide-react';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';

interface HistoryPeriodControlsProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

const presets = [7, 28, 90] as const;

export function HistoryPeriodControls({ from, to, onChange }: HistoryPeriodControlsProps) {
  const today = toLocalDate();

  const applyPreset = (days: number) => {
    onChange(toLocalDate(addDays(new Date(), -(days - 1))), today);
  };

  return (
    <Card className="mt-5 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <CalendarRange aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-slate-950 dark:text-white">Période analysée</p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">
            {formatLocalDate(from)} au {formatLocalDate(to)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {presets.map((days) => (
          <Button key={days} variant="secondary" size="sm" onClick={() => applyPreset(days)}>
            {days} jours
          </Button>
        ))}
      </div>

      <details className="mt-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
          Période personnalisée
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="history-from" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Du
            </label>
            <input
              id="history-from"
              type="date"
              value={from}
              max={to}
              onChange={(event) => onChange(event.target.value, to)}
              className={`${inputClassName} mt-2`}
            />
          </div>
          <div>
            <label htmlFor="history-to" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Au
            </label>
            <input
              id="history-to"
              type="date"
              value={to}
              min={from}
              onChange={(event) => onChange(from, event.target.value)}
              className={`${inputClassName} mt-2`}
            />
          </div>
        </div>
      </details>
    </Card>
  );
}
