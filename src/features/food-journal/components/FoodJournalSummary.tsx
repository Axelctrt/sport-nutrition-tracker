import type { DailyNutritionSummary, RemainingNutrition } from '@/domain/calculations/nutrition';
import type { DailyTarget } from '@/domain/models/targets';
import { Card } from '@/shared/ui/Card';
import { ProgressBar } from '@/shared/ui/ProgressBar';

interface FoodJournalSummaryProps {
  className?: string;
  totals: DailyNutritionSummary;
  target?: DailyTarget | undefined;
  remaining?: RemainingNutrition | undefined;
}

function round(value: number): number {
  return Math.round(value);
}

function remainingLabel(value: number): string {
  return value >= 0 ? `reste ${round(value)} g` : `dépassé de ${Math.abs(round(value))} g`;
}

export function FoodJournalSummary({ className, totals, target, remaining }: FoodJournalSummaryProps) {
  const remainingCalories = remaining?.caloriesKcal;

  return (
    <Card className={`p-4 sm:p-5 ${className ?? ''}`} aria-label="Résumé nutritionnel de la journée">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Consommé aujourd’hui
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950 dark:text-white">
            {round(totals.caloriesKcal)} kcal
          </p>
        </div>
        {remainingCalories !== undefined ? (
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {remainingCalories >= 0 ? 'Restantes' : 'Dépassement'}
            </p>
            <p className="mt-1 font-semibold tabular-nums text-slate-950 dark:text-white">
              {Math.abs(round(remainingCalories))} kcal
            </p>
          </div>
        ) : null}
      </div>

      {target ? (
        <ProgressBar
          className="mt-4"
          label="Cible calorique"
          value={totals.caloriesKcal}
          max={target.targetCaloriesKcal}
          indicatorClassName="bg-orange-500"
        />
      ) : null}

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="min-w-0 rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-950/25">
          <dt className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Protéines</dt>
          <dd className="mt-1 font-bold tabular-nums text-emerald-950 dark:text-emerald-100">{round(totals.proteinGrams)} g</dd>
          {remaining ? <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">{remainingLabel(remaining.proteinGrams)}</p> : null}
        </div>
        <div className="min-w-0 rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-950/25">
          <dt className="text-xs font-semibold text-amber-800 dark:text-amber-300">Glucides</dt>
          <dd className="mt-1 font-bold tabular-nums text-amber-950 dark:text-amber-100">{round(totals.carbohydratesGrams)} g</dd>
          {remaining ? <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300">{remainingLabel(remaining.carbohydratesGrams)}</p> : null}
        </div>
        <div className="min-w-0 rounded-xl bg-violet-50 px-3 py-2 dark:bg-violet-950/25">
          <dt className="text-xs font-semibold text-violet-800 dark:text-violet-300">Lipides</dt>
          <dd className="mt-1 font-bold tabular-nums text-violet-950 dark:text-violet-100">{round(totals.fatGrams)} g</dd>
          {remaining ? <p className="mt-0.5 text-[11px] text-violet-700 dark:text-violet-300">{remainingLabel(remaining.fatGrams)}</p> : null}
        </div>
      </dl>
    </Card>
  );
}
