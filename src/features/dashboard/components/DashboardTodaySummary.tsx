import { Footprints, Scale } from 'lucide-react';
import type { DailyTargetSnapshot } from '@/application/daily/dailyTargetCoordinator';
import {
  DASHBOARD_SUMMARY_METRIC_IDS,
  type DashboardDensity,
  type DashboardSummaryMetricId,
} from '@/domain/dashboard/dashboardPreferences';
import type { DailyDashboardNutrition } from '@/features/dashboard/hooks/useDailyDashboard';
import { Card } from '@/shared/ui/Card';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { formatLocalDate } from '@/shared/utils/dates';

interface DashboardTodaySummaryProps {
  snapshot: DailyTargetSnapshot;
  nutrition: DailyDashboardNutrition;
  dailyStepGoal: number;
  visibleMetrics?: readonly DashboardSummaryMetricId[];
  currentWeightKg?: number;
  currentWeightMeasuredAt?: string;
  density?: DashboardDensity;
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
  visibleMetrics = DASHBOARD_SUMMARY_METRIC_IDS,
  currentWeightKg,
  currentWeightMeasuredAt,
  density = 'comfortable',
  isRefreshing = false,
}: DashboardTodaySummaryProps) {
  const consumedCalories = rounded(nutrition.consumed.caloriesKcal);
  const remainingCalories = rounded(nutrition.remaining.caloriesKcal);
  const transparency = snapshot.energyTransparency;
  const expectedSteps = snapshot.energyGuidance?.expectedSteps.expectedSteps
    ?? snapshot.calculation.steps.totalSteps;
  const actualSteps = snapshot.stepsEntry?.totalSteps;
  const finalExpenditureKcal = snapshot.energyGuidance?.finalExpenditure
    ?.energy.totalEstimatedExpenditureKcal;
  const showMacros = visibleMetrics.includes('macros');
  const showSteps = visibleMetrics.includes('steps');
  const showWeight = visibleMetrics.includes('weight');
  const secondaryMetricCount = Number(showSteps) + Number(showWeight);
  const resolvedCurrentWeight = currentWeightKg ?? snapshot.weight.weightKg;
  const weightCaption = currentWeightMeasuredAt
    ? `Mesuré le ${formatLocalDate(currentWeightMeasuredAt, 'd MMMM')}`
    : 'Valeur initiale du profil';

  return (
    <Card className={`${density === 'compact' ? 'mt-3' : 'mt-5'} overflow-hidden`} aria-busy={isRefreshing}>
      <div className={density === 'compact' ? 'p-4' : 'p-4 sm:p-5'}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Cible alimentaire guidée
              </p>
              {isRefreshing ? (
                <span className="text-xs font-medium text-brand-700 dark:text-brand-300" role="status">
                  Mise à jour…
                </span>
              ) : null}
            </div>
            <p className={`${density === 'compact' ? 'mt-0.5 text-2xl' : 'mt-1 text-3xl'} font-bold tracking-tight tabular-nums text-slate-950 dark:text-white`}>
              {consumedCalories.toLocaleString('fr-FR')}
              <span className="mx-1 text-xl font-semibold text-slate-400 dark:text-slate-500">/</span>
              {snapshot.target.targetCaloriesKcal.toLocaleString('fr-FR')}
              <span className="ml-1 text-base font-semibold text-slate-500 dark:text-slate-400">
                kcal
              </span>
            </p>
            {finalExpenditureKcal !== undefined ? (
              <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Dépense finale estimée : {Math.round(finalExpenditureKcal).toLocaleString('fr-FR')} kcal
              </p>
            ) : null}
            {transparency && transparency.rawSportCaloriesKcal > 0 ? (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  Avant sport : {transparency.targetBeforeSportKcal.toLocaleString('fr-FR')} kcal
                </span>
                <span className="font-semibold text-brand-700 dark:text-brand-300">
                  Sport : +{Math.round(transparency.targetSportImpactKcal).toLocaleString('fr-FR')} kcal
                </span>
              </div>
            ) : null}
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
          className={density === 'compact' ? 'mt-3' : 'mt-4'}
          value={nutrition.consumed.caloriesKcal}
          max={snapshot.target.targetCaloriesKcal}
          label="Progression calorique"
          indicatorClassName={remainingCalories >= 0 ? 'bg-brand-600' : 'bg-red-600'}
        />

        {showMacros ? (
          <dl className={`${density === 'compact' ? 'mt-3 pt-3' : 'mt-4 pt-4'} grid grid-cols-3 gap-2 border-t border-slate-200 dark:border-slate-800`}>
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
        ) : null}
      </div>

      {secondaryMetricCount > 0 ? (
        <dl className={`grid border-t border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40 ${secondaryMetricCount === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {showSteps ? (
            <div className={`min-w-0 p-4 ${showWeight ? 'border-r border-slate-200 dark:border-slate-800' : ''}`}>
              <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Footprints aria-hidden="true" className="size-4" />
                {actualSteps === undefined ? 'Pas attendus' : 'Pas réels'}
              </dt>
              <dd className="mt-1 text-lg font-bold tabular-nums text-slate-950 dark:text-white">
                {(actualSteps ?? expectedSteps).toLocaleString('fr-FR')}
              </dd>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {actualSteps === undefined
                  ? `objectif ${dailyStepGoal.toLocaleString('fr-FR')}`
                  : `attendus ${expectedSteps.toLocaleString('fr-FR')} · objectif ${dailyStepGoal.toLocaleString('fr-FR')}`}
              </p>
            </div>
          ) : null}
          {showWeight ? (
            <div className="min-w-0 p-4">
              <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Scale aria-hidden="true" className="size-4" />
                Poids actuel
              </dt>
              <dd className="mt-1 truncate text-lg font-bold tabular-nums text-slate-950 dark:text-white">
                {resolvedCurrentWeight.toLocaleString('fr-FR')} kg
              </dd>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {weightCaption}
              </p>
            </div>
          ) : null}
        </dl>
      ) : null}
    </Card>
  );
}
