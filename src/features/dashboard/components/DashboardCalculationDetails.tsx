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
          La cible tient compte du profil, du poids de calcul, des pas, des activités et de l’objectif choisi.{' '}
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
              {snapshot.weight.source === 'weightEntry'
                ? `pesée du ${formatLocalDate(snapshot.weight.weightEntry.date)}`
                : 'profil initial'}
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
      </dl>

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
