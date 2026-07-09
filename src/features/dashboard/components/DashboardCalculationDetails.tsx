import { Activity, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DailyTargetSnapshot } from '@/application/daily/dailyTargetCoordinator';
import { routePaths } from '@/app/routePaths';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { formatLocalDate } from '@/shared/utils/dates';

function rounded(value: number): number {
  return Math.round(value);
}

export function DashboardCalculationDetails({ snapshot }: { snapshot: DailyTargetSnapshot }) {
  return (
    <CollapsibleSection
      className="mt-4"
      title="Objectifs et détails du calcul"
      description="Informations secondaires utilisées pour les estimations du jour."
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

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600 dark:text-slate-300">Cible énergétique</dt>
          <dd className="font-semibold tabular-nums text-slate-950 dark:text-white">
            {snapshot.target.targetCaloriesKcal.toLocaleString('fr-FR')} kcal
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600 dark:text-slate-300">Dépense estimée</dt>
          <dd className="font-semibold tabular-nums text-slate-950 dark:text-white">
            {rounded(snapshot.target.energy.totalEstimatedExpenditureKcal).toLocaleString('fr-FR')} kcal
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
            Activités enregistrées
          </dt>
          <dd className="font-semibold tabular-nums text-slate-950 dark:text-white">
            {snapshot.activities.length}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600 dark:text-slate-300">Séances prévues ou détaillées</dt>
          <dd className="text-right font-semibold tabular-nums text-slate-950 dark:text-white">
            {snapshot.plannedActivities.length}
            <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
              {rounded(snapshot.target.energy.plannedActivitiesKcal ?? 0).toLocaleString('fr-FR')} kcal
            </span>
          </dd>
        </div>
      </dl>

      {snapshot.plannedActivities.length > 0 ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">
            Projection sportive de la journée
          </p>
          <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {snapshot.plannedActivities.map((activity) => (
              <li key={activity.id} className="flex justify-between gap-3">
                <span>
                  {activity.title}
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {activity.basis === 'actualDuration'
                      ? 'durée réelle de la séance détaillée'
                      : 'estimation planifiée'}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-slate-950 dark:text-white">
                  {rounded(activity.estimatedCaloriesKcal)} kcal
                </span>
              </li>
            ))}
          </ul>
        </div>
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
