import { Clock3, Gauge } from 'lucide-react';
import type { ActivityIntensity } from '@/domain/models/activity';
import { intensityLabels } from '@/features/activities/utils/activityLabels';
import { cn } from '@/shared/utils/cn';

interface ActivityQuickControlsProps {
  durationMinutes: number;
  intensity: ActivityIntensity;
  onDurationChange: (durationMinutes: number) => void;
  onIntensityChange: (intensity: ActivityIntensity) => void;
}

const durationOptions = [20, 30, 45, 60, 90] as const;
const intensityOptions = ['low', 'moderate', 'high'] as const;

function optionClassName(selected: boolean): string {
  return cn(
    'inline-flex min-h-11 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-colors motion-reduce:transition-none',
    selected
      ? 'border-brand-700 bg-brand-700 text-white dark:border-brand-500 dark:bg-brand-600'
      : 'border-slate-300 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-800 dark:hover:bg-brand-950/30',
  );
}

export function ActivityQuickControls({
  durationMinutes,
  intensity,
  onDurationChange,
  onIntensityChange,
}: ActivityQuickControlsProps) {
  return (
    <div className="grid gap-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/50 sm:grid-cols-2 sm:p-4">
      <fieldset>
        <legend className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <Clock3 aria-hidden="true" className="size-4 text-brand-700 dark:text-brand-300" />
          Durée rapide
        </legend>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {durationOptions.map((duration) => (
            <button
              key={duration}
              type="button"
              className={optionClassName(durationMinutes === duration)}
              aria-label={`${duration} minutes`}
              aria-pressed={durationMinutes === duration}
              onClick={() => onDurationChange(duration)}
            >
              {duration}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <Gauge aria-hidden="true" className="size-4 text-brand-700 dark:text-brand-300" />
          Intensité
        </legend>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {intensityOptions.map((value) => (
            <button
              key={value}
              type="button"
              className={optionClassName(intensity === value)}
              aria-pressed={intensity === value}
              onClick={() => onIntensityChange(value)}
            >
              {intensityLabels[value]}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
