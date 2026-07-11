import { Activity, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DailyTargetSnapshot } from '@/application/daily/dailyTargetCoordinator';
import type { DailySportEnergyItem } from '@/application/daily/dailyEnergyTransparency';
import { routePaths } from '@/app/routePaths';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { formatLocalDate } from '@/shared/utils/dates';

function rounded(value: number): number {
  return Math.round(value);
}

function formatSignedCalories(value: number | undefined): string {
  const normalizedValue = value !== undefined && Number.isFinite(value) ? value : 0;
  const roundedValue = rounded(normalizedValue);
  const prefix = roundedValue > 0 ? '+' : '';
  return `${prefix}${roundedValue.toLocaleString('fr-FR')} kcal`;
}

function itemStatus(item: DailySportEnergyItem): string {
  switch (item.status) {
    case 'planned':
      return 'séance encore prévue';
    case 'realizedPlanned':
      return item.plannedCaloriesKcal === undefined
        ? 'séance réalisée'
        : `réalisée · remplace ${rounded(item.plannedCaloriesKcal).toLocaleString('fr-FR')} kcal prévus`;
    case 'unplanned':
      return 'activité imprévue';
    case 'includedInSteps':
      return 'déjà incluse dans les pas';
  }
}

export function DashboardCalculationDetails({ snapshot }: { snapshot: DailyTargetSnapshot }) {
  const transparency = snapshot.energyTransparency;

  return (
    <CollapsibleSection
      className="mt-4"
      title="Objectifs et détails du calcul"
      description="Détail du passage de la cible avant sport à la cible alimentaire actuelle."
      summary={`${snapshot.target.targetCaloriesKcal.toLocaleString('fr-FR')} kcal`}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
          <Calculator aria-hidden="true" className="size-5" />
        </span>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          La cible tient compte du profil, du poids de calcul, des pas, des activités enregistrées, des séances prévues et de l’objectif choisi.{' '}
          <Link
            to={routePaths.calculationsInformation}
            className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            Comprendre les calculs
          </Link>
        </p>
      </div>

      {transparency ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">
            Évolution de la cible aujourd’hui
          </p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Cible avant sport</dt>
              <dd className="mt-1 font-bold tabular-nums text-slate-950 dark:text-white">
                {rounded(transparency.targetBeforeSportKcal).toLocaleString('fr-FR')} kcal
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Séances encore prévues</dt>
              <dd className="mt-1 font-bold tabular-nums text-sky-700 dark:text-sky-300">
                {formatSignedCalories(transparency.plannedSportCaloriesKcal)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Activités réalisées</dt>
              <dd className="mt-1 font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                {formatSignedCalories(transparency.actualSportCaloriesKcal)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Cible actuelle</dt>
              <dd className="mt-1 font-bold tabular-nums text-slate-950 dark:text-white">
                {transparency.currentTargetKcal.toLocaleString('fr-FR')} kcal
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Impact réel du sport sur la cible après arrondi et plancher :{' '}
            <strong className="text-slate-700 dark:text-slate-200">
              {formatSignedCalories(transparency.targetSportImpactKcal)}
            </strong>
          </p>
        </div>
      ) : null}

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600 dark:text-slate-300">Dépense estimée hors sport</dt>
          <dd className="font-semibold tabular-nums text-slate-950 dark:text-white">
            {rounded(
              transparency?.expenditureWithoutSportKcal
                ?? snapshot.target.energy.totalEstimatedExpenditureKcal,
            ).toLocaleString('fr-FR')} kcal
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600 dark:text-slate-300">Ajustement de l’objectif</dt>
          <dd className="font-semibold tabular-nums text-slate-950 dark:text-white">
            {formatSignedCalories(snapshot.calculation.goalAdjustmentKcal)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600 dark:text-slate-300">Calibration acceptée</dt>
          <dd className="font-semibold tabular-nums text-slate-950 dark:text-white">
            {formatSignedCalories(snapshot.calculation.acceptedCalibrationAdjustmentKcal)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600 dark:text-slate-300">Poids de calcul</dt>
          <dd className="text-right font-semibold tabular-nums text-slate-950 dark:text-white">
            {snapshot.weight.weightKg.toLocaleString('fr-FR')} kg
            <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
              {snapshot.weight.source === 'previousWeekAverage'
                ? `moyenne du ${formatLocalDate(snapshot.weight.period.start)} au ${formatLocalDate(snapshot.weight.period.end)} (${snapshot.weight.dailyWeights.length} jour${snapshot.weight.dailyWeights.length > 1 ? 's' : ''})`
                : `poids du profil — aucune pesée du ${formatLocalDate(snapshot.weight.period.start)} au ${formatLocalDate(snapshot.weight.period.end)}`}
            </span>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600 dark:text-slate-300">Pas hors course</dt>
          <dd className="font-semibold tabular-nums text-slate-950 dark:text-white">
            {snapshot.calculation.steps.nonRunningSteps.toLocaleString('fr-FR')}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600 dark:text-slate-300">Marche supplémentaire</dt>
          <dd className="font-semibold tabular-nums text-slate-950 dark:text-white">
            {rounded(snapshot.target.energy.walkingKcal)} kcal
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 dark:border-slate-800">
          <dt className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Activity aria-hidden="true" className="size-4" />
            Éléments sportifs pris en compte
          </dt>
          <dd className="font-semibold tabular-nums text-slate-950 dark:text-white">
            {transparency?.items.length ?? snapshot.activities.length + snapshot.plannedActivities.length}
          </dd>
        </div>
      </dl>

      {transparency && transparency.items.length > 0 ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">
            Sport prévu et réalisé
          </p>
          <ul className="mt-2 divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {transparency.items.map((item) => (
              <li key={item.id} className="flex gap-3 py-3 first:pt-1 last:pb-1">
                <span className="min-w-0 flex-1">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {itemStatus(item)} · {item.calculationSource === 'manual' ? 'saisie manuelle' : 'estimation automatique'}
                  </span>
                  {item.deltaCaloriesKcal !== undefined ? (
                    <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">
                      Écart prévu/réel : {formatSignedCalories(item.deltaCaloriesKcal)}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-slate-950 dark:text-white">
                  {item.status === 'includedInSteps'
                    ? '0 kcal ajoutée'
                    : formatSignedCalories(item.caloriesKcal)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {transparency?.floorLimitedSportImpact ? (
        <InlineNotice className="mt-4" title="Impact limité par le plancher calorique">
          Une partie de l’énergie sportive ne modifie pas encore la cible finale, car celle-ci reste protégée par le plancher calorique configuré.
        </InlineNotice>
      ) : null}

      {snapshot.calculation.goalRateWasNormalized ? (
        <InlineNotice className="mt-4" title="Variation hebdomadaire normalisée">
          Le signe enregistré ne correspondait pas à l’objectif du profil. SportPilot a utilisé {snapshot.calculation.targetWeeklyWeightChangePercentUsed.toLocaleString('fr-FR')} % par semaine pour garantir un calcul cohérent.
        </InlineNotice>
      ) : null}

      {snapshot.calculation.macroDetails.carbohydratesClampedToZero ? (
        <InlineNotice className="mt-4" title="Glucides ramenés à zéro">
          Les objectifs de protéines et de lipides utilisent déjà toute la cible calorique disponible.
        </InlineNotice>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link to={routePaths.weight} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
          Historique du poids
        </Link>
        <Link to={routePaths.settings} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
          Paramètres énergétiques
        </Link>
      </div>
    </CollapsibleSection>
  );
}
