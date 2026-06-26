import { Footprints, Scale } from 'lucide-react';
import type { DailyTargetSnapshot } from '@/application/daily/dailyTargetCoordinator';
import type { DailyDashboardNutrition } from '@/features/dashboard/hooks/useDailyDashboard';
import { Card } from '@/shared/ui/Card';
import { ProgressBar } from '@/shared/ui/ProgressBar';

interface DashboardTodaySummaryProps {
  snapshot: DailyTargetSnapshot;
  nutrition: DailyDashboardNutrition;
  dailyStepGoal: number;
  isRefreshing?: boolean;
}

function rounded(value: number): number {
  return Math.round(value);
}

function MacroMetric({
  label,
  consumed,
  target,
}: {
  label: string;
  consumed: number;
  target: number;
}) {
  return (
    <div className="min-w-0 text-center">
      <dt className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-bold tabular-nums text-slate-950 dark:text-white sm:text-base">
        {rounded(consumed).toLocaleString('fr-FR')}
        <span className="font-medium text-slate-400 dark:text-slate-500"> / {target.toLocaleString('fr-FR')} g</span>
      </dd>
    </div>
  );
}

export function DashboardTodaySummary({
  snapshot,
  nutrition,
  dailyStepGoal,
  isRefreshing = false,
}: DashboardTodaySummaryProps) {
  const consumedCalories = rounded(nutrition.consumed.caloriesKcal);
  const remainingCalories = rounded(nutrition.remaining.caloriesKcal);
  const todayWeight = snapshot.weight.source === 'weightEntry'
    && snapshot.weight.weightEntry.date === snapshot.date
    ? snapshot.weight.weightKg
    : undefined;

  return (
    <Card className="mt-5 overflow-hidden" aria-busy={isRefreshing}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Calories consommées</p>
              {isRefreshing ? (
                <span className="text-xs font-medium text-brand-700 dark:text-brand-300" role="status">
                  Mise à jour…
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-slate-950 dark:text-white">
              {consumedCalories.toLocaleString('fr-FR')}
              <span className="ml-1 text-base font-semibold text-slate-500 dark:text-slate-400">kcal</span>
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Cible : {snapshot.target.targetCaloriesKcal.toLocaleString('fr-FR')} kcal
            </p>
          </div>
          <div
            className={`shrink-0 rounded-xl px-3 py-2 text-right ${
              remainingCalories >= 0
                ? 'bg-brand-50 text-brand-900 dark:bg-brand-950/70 dark:text-brand-100'
                : 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-200'
            }`}
          >
            <p className="text-lg font-bold tabular-nums">
              {Math.abs(remainingCalories).toLocaleString('fr-FR')}
            </p>
            <p className="text-xs font-semibold">kcal {remainingCalories >= 0 ? 'restantes' : 'dépassées'}</p>
          </div>
        </div>

        <ProgressBar
          className="mt-4"
          value={nutrition.consumed.caloriesKcal}
          max={snapshot.target.targetCaloriesKcal}
          label="Progression calorique"
          indicatorClassName={remainingCalories >= 0 ? 'bg-brand-600' : 'bg-red-600'}
        />

        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <MacroMetric
            label="Protéines"
            consumed={nutrition.consumed.proteinGrams}
            target={snapshot.target.macros.proteinGrams}
          />
          <MacroMetric
            label="Glucides"
            consumed={nutrition.consumed.carbohydratesGrams}
            target={snapshot.target.macros.carbohydratesGrams}
          />
          <MacroMetric
            label="Lipides"
            consumed={nutrition.consumed.fatGrams}
            target={snapshot.target.macros.fatGrams}
          />
        </dl>
      </div>

      <dl className="grid grid-cols-2 border-t border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="min-w-0 border-r border-slate-200 p-4 dark:border-slate-800">
          <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Footprints aria-hidden="true" className="size-4" />
            Pas du jour
          </dt>
          <dd className="mt-1 text-lg font-bold tabular-nums text-slate-950 dark:text-white">
            {snapshot.calculation.steps.totalSteps.toLocaleString('fr-FR')}
          </dd>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            sur {dailyStepGoal.toLocaleString('fr-FR')}
          </p>
        </div>
        <div className="min-w-0 p-4">
          <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Scale aria-hidden="true" className="size-4" />
            Poids du jour
          </dt>
          <dd className="mt-1 truncate text-lg font-bold tabular-nums text-slate-950 dark:text-white">
            {todayWeight === undefined ? 'Non saisi' : `${todayWeight.toLocaleString('fr-FR')} kg`}
          </dd>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {todayWeight === undefined
              ? `Calcul actuel : ${snapshot.weight.weightKg.toLocaleString('fr-FR')} kg`
              : 'Pesée enregistrée'}
          </p>
        </div>
      </dl>
    </Card>
  );
}
