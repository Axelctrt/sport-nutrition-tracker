import type { DailyNutritionSummary, RemainingNutrition } from '@/domain/calculations/nutrition';
import type { DailyTarget } from '@/domain/models/targets';
import { Card } from '@/shared/ui/Card';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { cn } from '@/shared/utils/cn';

interface FoodJournalSummaryProps {
  className?: string;
  totals: DailyNutritionSummary;
  target?: DailyTarget | undefined;
  remaining?: RemainingNutrition | undefined;
}

function round(value: number): number {
  return Math.round(value);
}

function remainingLabel(value: number, unit = 'g'): string {
  return value >= 0
    ? `${round(value)} ${unit} restants`
    : `${Math.abs(round(value))} ${unit} au-dessus`;
}

interface MacroProgressProps {
  label: string;
  value: number;
  target?: number | undefined;
  remaining?: number | undefined;
  indicatorClassName: string;
}

function MacroProgress({
  label,
  value,
  target,
  remaining,
  indicatorClassName,
}: MacroProgressProps) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
        <p className="text-sm font-bold tabular-nums text-slate-950 dark:text-white">
          {round(value)} g
          {target !== undefined ? (
            <span className="font-normal text-slate-500 dark:text-slate-400"> / {round(target)} g</span>
          ) : null}
        </p>
      </div>
      {target !== undefined ? (
        <ProgressBar
          className="mt-2"
          label={`Progression ${label.toLocaleLowerCase('fr')}`}
          value={value}
          max={target}
          indicatorClassName={indicatorClassName}
        />
      ) : null}
      {remaining !== undefined ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {remainingLabel(remaining)}
        </p>
      ) : null}
    </div>
  );
}

export function FoodJournalSummary({ className, totals, target, remaining }: FoodJournalSummaryProps) {
  const remainingCalories = remaining?.caloriesKcal;

  return (
    <Card
      className={cn('overflow-hidden', className)}
      aria-label="Résumé nutritionnel de la journée"
    >
      <div className="grid gap-px bg-slate-200 dark:bg-slate-800 sm:grid-cols-3">
        <div className="bg-white p-4 dark:bg-slate-900 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Consommées
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-950 dark:text-white">
            {round(totals.caloriesKcal)}
            <span className="ml-1 text-base font-semibold text-slate-500 dark:text-slate-400">kcal</span>
          </p>
        </div>

        <div className="bg-white p-4 dark:bg-slate-900 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {remainingCalories !== undefined && remainingCalories < 0 ? 'Dépassement' : 'Restantes'}
          </p>
          <p className={cn(
            'mt-1 text-3xl font-bold tabular-nums',
            remainingCalories !== undefined && remainingCalories < 0
              ? 'text-amber-700 dark:text-amber-300'
              : 'text-brand-700 dark:text-brand-300',
          )}>
            {remainingCalories === undefined ? '—' : Math.abs(round(remainingCalories))}
            <span className="ml-1 text-base font-semibold text-slate-500 dark:text-slate-400">kcal</span>
          </p>
        </div>

        <div className="bg-white p-4 dark:bg-slate-900 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Objectif
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-950 dark:text-white">
            {target ? round(target.targetCaloriesKcal) : '—'}
            <span className="ml-1 text-base font-semibold text-slate-500 dark:text-slate-400">kcal</span>
          </p>
        </div>
      </div>

      <div className="border-t border-slate-200 p-4 dark:border-slate-800 sm:p-5">
        {target ? (
          <ProgressBar
            label="Progression calorique"
            value={totals.caloriesKcal}
            max={target.targetCaloriesKcal}
            indicatorClassName="bg-orange-500"
          />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            La cible de cette journée n’est pas encore disponible.
          </p>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <MacroProgress
            label="Protéines"
            value={totals.proteinGrams}
            target={target?.macros.proteinGrams}
            remaining={remaining?.proteinGrams}
            indicatorClassName="bg-emerald-500"
          />
          <MacroProgress
            label="Glucides"
            value={totals.carbohydratesGrams}
            target={target?.macros.carbohydratesGrams}
            remaining={remaining?.carbohydratesGrams}
            indicatorClassName="bg-amber-500"
          />
          <MacroProgress
            label="Lipides"
            value={totals.fatGrams}
            target={target?.macros.fatGrams}
            remaining={remaining?.fatGrams}
            indicatorClassName="bg-violet-500"
          />
        </div>
      </div>
    </Card>
  );
}
