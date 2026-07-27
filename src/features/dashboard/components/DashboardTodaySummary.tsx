import { ChevronDown, Footprints, Scale } from 'lucide-react';
import { useState } from 'react';
import type { DailyTargetSnapshot } from '@/application/daily/dailyTargetCoordinator';
import {
  DASHBOARD_SUMMARY_METRIC_IDS,
  type DashboardDensity,
  type DashboardSummaryMetricId,
} from '@/domain/dashboard/dashboardPreferences';
import type { DailyDashboardNutrition } from '@/features/dashboard/hooks/useDailyDashboard';
import { Card } from '@/shared/ui/Card';
import { ContextHelp } from '@/shared/ui/ContextHelp';
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
      <dd data-responsive-essential="value" className="mt-1 text-[0.8125rem] font-bold tabular-nums text-slate-950 dark:text-white sm:text-base">
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
  const [energyBalanceOpen, setEnergyBalanceOpen] = useState(false);
  const consumedCalories = rounded(nutrition.consumed.caloriesKcal);
  const remainingCalories = rounded(nutrition.remaining.caloriesKcal);
  const transparency = snapshot.energyTransparency;
  const expectedSteps = snapshot.energyGuidance?.expectedSteps.expectedSteps
    ?? snapshot.calculation.steps.totalSteps;
  const actualSteps = snapshot.stepsEntry?.totalSteps;
  const finalExpenditureKcal = snapshot.energyGuidance?.finalExpenditure
    ?.energy.totalEstimatedExpenditureKcal;
  const hasFinalEnergyBalance = snapshot.energyGuidance?.finalStatus === 'final'
    && finalExpenditureKcal !== undefined;
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
        <div className="flex flex-col items-stretch gap-3 min-[380px]:flex-row min-[380px]:items-start min-[380px]:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Cible alimentaire guidée
              </p>
              <ContextHelp
                iconOnly
                question="À propos de la cible alimentaire"
                tone="brand"
              >
                Les calories et macronutriments sont des estimations de pilotage,
                pas des mesures médicales.
              </ContextHelp>
              {isRefreshing ? (
                <span className="text-xs font-medium text-brand-700 dark:text-brand-300" role="status">
                  Mise à jour…
                </span>
              ) : null}
            </div>
            <p
              data-responsive-essential="value"
              className={`${density === 'compact' ? 'mt-0.5 text-2xl' : 'mt-1 text-3xl'} font-bold tracking-tight tabular-nums text-slate-950 dark:text-white`}
            >
              {consumedCalories.toLocaleString('fr-FR')}
              <span className="mx-1 text-xl font-semibold text-slate-400 dark:text-slate-500">/</span>
              {snapshot.target.targetCaloriesKcal.toLocaleString('fr-FR')}
              <span className="ml-1 text-base font-semibold text-slate-500 dark:text-slate-400">
                kcal
              </span>
            </p>
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
            data-responsive-essential="value"
            className={`w-fit shrink-0 self-start rounded-xl px-3 py-2 text-left min-[380px]:self-auto min-[380px]:text-right ${
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

        {hasFinalEnergyBalance ? (
          <div className={`${density === 'compact' ? 'mt-3' : 'mt-4'} border-t border-slate-200 pt-3 dark:border-slate-800`}>
            <button
              type="button"
              aria-expanded={energyBalanceOpen}
              className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
              onClick={() => setEnergyBalanceOpen((current) => !current)}
            >
              Bilan de la journée disponible
              <ChevronDown
                aria-hidden="true"
                className={`size-4 shrink-0 transition-transform ${energyBalanceOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {energyBalanceOpen ? (
              <div className="pb-1 pt-2" aria-label="Bilan énergétique de la journée">
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-600 dark:text-slate-300">Calories enregistrées</dt>
                    <dd className="shrink-0 font-semibold tabular-nums text-slate-950 dark:text-white">
                      {consumedCalories.toLocaleString('fr-FR')} kcal
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-600 dark:text-slate-300">Cible alimentaire guidée</dt>
                    <dd className="shrink-0 font-semibold tabular-nums text-slate-950 dark:text-white">
                      {snapshot.target.targetCaloriesKcal.toLocaleString('fr-FR')} kcal
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-600 dark:text-slate-300">Dépense du jour estimée</dt>
                    <dd className="shrink-0 font-semibold tabular-nums text-slate-950 dark:text-white">
                      {Math.round(finalExpenditureKcal).toLocaleString('fr-FR')} kcal
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-600 dark:text-slate-300">Pas réels</dt>
                    <dd className="shrink-0 font-semibold tabular-nums text-slate-950 dark:text-white">
                      {(actualSteps ?? 0).toLocaleString('fr-FR')}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-600 dark:text-slate-300">Activités réalisées</dt>
                    <dd className="shrink-0 font-semibold tabular-nums text-slate-950 dark:text-white">
                      {snapshot.activities?.length ?? 0}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  La dépense est une estimation utilisée pour analyser la journée et améliorer les tendances futures. Elle ne remplace pas ta cible alimentaire.
                </p>
              </div>
            ) : null}
          </div>
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
              <dd data-responsive-essential="value" className="mt-1 text-lg font-bold tabular-nums text-slate-950 dark:text-white">
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
              <dd data-responsive-essential="value" className="mt-1 truncate text-lg font-bold tabular-nums text-slate-950 dark:text-white">
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
