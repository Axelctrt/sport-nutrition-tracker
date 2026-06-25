import { Activity, Calculator, CircleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProfile } from '@/app/providers/profile/useProfile';
import { editActivityPath, routePaths } from '@/app/routePaths';
import { presentActivity } from '@/features/activities/utils/activityPresentation';
import { DashboardActiveWorkout } from '@/features/dashboard/components/DashboardActiveWorkout';
import { DashboardQuickActions } from '@/features/dashboard/components/DashboardQuickActions';
import { DashboardTodaySummary } from '@/features/dashboard/components/DashboardTodaySummary';
import { useDailyDashboard } from '@/features/dashboard/hooks/useDailyDashboard';
import { Button } from '@/shared/ui/Button';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { formatLocalDate } from '@/shared/utils/dates';

function rounded(value: number): number {
  return Math.round(value);
}

export function DashboardPage() {
  const { profile } = useProfile();
  const {
    date,
    status,
    snapshot,
    nutrition,
    activeWorkout,
    errorMessage,
    refresh,
    saveWeight,
    saveSteps,
  } = useDailyDashboard();

  if (!profile) {
    return null;
  }

  const firstName = profile.firstName?.trim();

  return (
    <section aria-labelledby="dashboard-title">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          {formatLocalDate(date, 'EEEE d MMMM')}
        </p>
        <h1
          id="dashboard-title"
          className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white"
        >
          {firstName ? `Bonjour ${firstName}` : 'Tableau de bord'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          L’essentiel de ta journée, puis les actions les plus utiles.
        </p>
      </div>

      {status === 'loading' && !snapshot ? (
        <PageSkeleton variant="dashboard" className="mt-6" />
      ) : null}

      {status === 'error' && !snapshot ? (
        <InlineNotice className="mt-6" tone="error" title="Tableau de bord indisponible" role="alert">
          <p>{errorMessage}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void refresh()}>
            Réessayer
          </Button>
        </InlineNotice>
      ) : null}

      {status === 'error' && snapshot ? (
        <InlineNotice className="mt-5" tone="error" title="Mise à jour impossible" role="alert">
          <p>{errorMessage} Les dernières données disponibles restent affichées.</p>
          <Button className="mt-3" variant="secondary" onClick={() => void refresh()}>
            Réessayer
          </Button>
        </InlineNotice>
      ) : null}

      {snapshot && nutrition ? (
        <>
          {activeWorkout ? <DashboardActiveWorkout workout={activeWorkout} /> : null}

          <DashboardTodaySummary
            snapshot={snapshot}
            nutrition={nutrition}
            dailyStepGoal={profile.dailyStepGoal}
            isRefreshing={status === 'loading'}
          />

          <DashboardQuickActions
            date={date}
            totalSteps={snapshot.calculation.steps.totalSteps}
            {...(snapshot.stepsEntry ? { stepsEntry: snapshot.stepsEntry } : {})}
            weightKg={snapshot.weight.weightKg}
            {...(snapshot.weight.source === 'weightEntry'
              && snapshot.weight.weightEntry.date === date
              ? { weightEntry: snapshot.weight.weightEntry }
              : {})}
            {...(activeWorkout ? { activeWorkout } : {})}
            onSaveWeight={saveWeight}
            onSaveSteps={saveSteps}
          />

          {snapshot.activities.length > 0 ? (
            <CollapsibleSection
              className="mt-5"
              title="Activités du jour"
              description="Course, natation, vélo et autres activités enregistrées."
              summary={`${snapshot.activities.length}`}
            >
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {snapshot.activities.map((activity) => {
                  const presentation = presentActivity(activity);
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <Link
                          to={editActivityPath(activity.id)}
                          className="block truncate font-semibold text-slate-950 hover:text-brand-700 dark:text-white dark:hover:text-brand-300"
                        >
                          {presentation.title}
                        </Link>
                        <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                          {presentation.subtitle} · {activity.durationMinutes} min
                        </p>
                      </div>
                      <p className="shrink-0 font-bold tabular-nums text-slate-950 dark:text-white">
                        {rounded(presentation.caloriesKcal)} kcal
                      </p>
                    </div>
                  );
                })}
              </div>
              <Link
                to={`${routePaths.activities}?date=${encodeURIComponent(date)}`}
                className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
              >
                Ouvrir le journal d’activités
              </Link>
            </CollapsibleSection>
          ) : null}

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
                La cible tient compte du profil, du poids de calcul, des pas, des activités et de l’objectif choisi.
                {' '}
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

          <p className="mt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Les calories et macronutriments sont des estimations de pilotage, pas des mesures médicales.
          </p>
        </>
      ) : status !== 'loading' && status !== 'error' ? (
        <InlineNotice className="mt-6" tone="error" title="Données quotidiennes absentes">
          <div className="flex items-center gap-2">
            <CircleAlert aria-hidden="true" className="size-4" />
            Recharge la page pour relancer le calcul.
          </div>
        </InlineNotice>
      ) : null}
    </section>
  );
}
