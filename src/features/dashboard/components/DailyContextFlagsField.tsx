import { ChevronDown } from 'lucide-react';
import {
  DAILY_CONTEXT_FLAGS,
  type DailyContextFlag,
} from '@/domain/models/dailyCoaching';
import { checkboxClassName } from '@/shared/forms/formStyles';

const contextLabels: Record<DailyContextFlag, string> = {
  menstrualCycle: 'Règles ou rétention d’eau',
  illness: 'Maladie',
  travel: 'Voyage',
  exceptionalPoorSleep: 'Mauvaise nuit exceptionnelle',
  highSodiumMeal: 'Repas très salé ou riche',
  creatineChange: 'Début ou arrêt de créatine',
  muscleSoreness: 'Fortes douleurs musculaires',
  other: 'Autre situation inhabituelle',
};

interface DailyContextFlagsFieldProps {
  value: readonly DailyContextFlag[];
  onChange: (value: DailyContextFlag[]) => void;
}

export function DailyContextFlagsField({
  value,
  onChange,
}: DailyContextFlagsFieldProps) {
  const toggle = (flag: DailyContextFlag) => {
    onChange(
      value.includes(flag)
        ? value.filter((current) => current !== flag)
        : [...value, flag],
    );
  };

  return (
    <details className="group rounded-xl border border-slate-200 dark:border-slate-800">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Contexte inhabituel
          </span>
          <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
            {value.length > 0
              ? `${value.length} élément${value.length > 1 ? 's' : ''} signalé${value.length > 1 ? 's' : ''}`
              : 'Facultatif'}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="grid gap-1 border-t border-slate-200 p-2 dark:border-slate-800 sm:grid-cols-2">
        {DAILY_CONTEXT_FLAGS.map((flag) => (
          <label
            key={flag}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <input
              type="checkbox"
              className={checkboxClassName}
              checked={value.includes(flag)}
              onChange={() => toggle(flag)}
            />
            <span>{contextLabels[flag]}</span>
          </label>
        ))}
      </div>
    </details>
  );
}
