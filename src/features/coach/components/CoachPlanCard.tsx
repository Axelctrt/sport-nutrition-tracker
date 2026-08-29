import { Activity, Apple, ArrowRight, CalendarDays, Dumbbell, Footprints } from 'lucide-react';
import { Link } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import type { CoachHubSnapshot } from '@/domain/coach/coachHub';
import type { WeightGoal } from '@/domain/models/profile';
import { Card } from '@/shared/ui/Card';
import { formatLocalDate } from '@/shared/utils/dates';

const orientationLabels: Record<WeightGoal, string> = {
  loss: 'Perte de poids',
  maintenance: 'Maintien',
  gain: 'Prise de poids',
};

function PlanLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--sp-accent-primary)]"
    >
      {label}
      <ArrowRight aria-hidden="true" className="size-4" />
    </Link>
  );
}

export function CoachPlanCard({ snapshot }: { snapshot: CoachHubSnapshot }) {
  const nutrition = snapshot.nutritionPlan;
  const nextSession = snapshot.trainingPlan.nextSession;

  return (
    <section aria-labelledby="coach-hub-plan-title">
      <div className="mb-3">
        <h2 id="coach-hub-plan-title" className="text-xl font-bold text-[var(--sp-text-primary)]">
          Plan actuel
        </h2>
        <p className="mt-1 text-sm text-[var(--sp-text-secondary)]">
          Les repères déjà enregistrés, sans recalcul ni modification.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Card padding="md" aria-labelledby="coach-nutrition-plan-title">
          <h3 id="coach-nutrition-plan-title" className="flex items-center gap-2 font-bold text-[var(--sp-text-primary)]">
            <Apple aria-hidden="true" className="size-5 text-[var(--sp-accent-primary)]" />
            Nutrition
          </h3>
          {nutrition.status === 'available' ? (
            <div className="mt-3 space-y-2 text-sm text-[var(--sp-text-secondary)]">
              <p><strong className="text-lg text-[var(--sp-text-primary)]">{nutrition.targetCaloriesKcal.toLocaleString('fr-FR')} kcal</strong> cibles</p>
              <dl className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[var(--sp-surface-muted)] p-2"><dt>Protéines</dt><dd className="font-bold text-[var(--sp-text-primary)]">{nutrition.macros.proteinGrams} g</dd></div>
                <div className="rounded-xl bg-[var(--sp-surface-muted)] p-2"><dt>Glucides</dt><dd className="font-bold text-[var(--sp-text-primary)]">{nutrition.macros.carbohydratesGrams} g</dd></div>
                <div className="rounded-xl bg-[var(--sp-surface-muted)] p-2"><dt>Lipides</dt><dd className="font-bold text-[var(--sp-text-primary)]">{nutrition.macros.fatGrams} g</dd></div>
              </dl>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[var(--sp-text-secondary)]">
              La cible nutritionnelle du jour n’est pas encore disponible.
            </p>
          )}
          <PlanLink to={routePaths.food} label="Ouvrir Nutrition" />
        </Card>

        <Card padding="md" aria-labelledby="coach-activity-plan-title">
          <h3 id="coach-activity-plan-title" className="flex items-center gap-2 font-bold text-[var(--sp-text-primary)]">
            <Footprints aria-hidden="true" className="size-5 text-[var(--sp-accent-primary)]" />
            Activité
          </h3>
          <p className="mt-3 text-lg font-bold text-[var(--sp-text-primary)]">
            {snapshot.activityPlan.dailyStepGoal.toLocaleString('fr-FR')} pas
          </p>
          {snapshot.activityPlan.plannedActivities.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-[var(--sp-text-secondary)]">
              {snapshot.activityPlan.plannedActivities.map((activity) => (
                <li key={activity.id} className="flex items-start gap-2">
                  <Activity aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {activity.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[var(--sp-text-secondary)]">
              Aucune activité planifiée aujourd’hui.
            </p>
          )}
          <PlanLink to={routePaths.activities} label="Ouvrir Sport" />
        </Card>

        <Card padding="md" aria-labelledby="coach-training-plan-title" className="sm:col-span-2 xl:col-span-1">
          <h3 id="coach-training-plan-title" className="flex items-center gap-2 font-bold text-[var(--sp-text-primary)]">
            <Dumbbell aria-hidden="true" className="size-5 text-[var(--sp-accent-primary)]" />
            Entraînement
          </h3>
          {nextSession ? (
            <div className="mt-3">
              <p className="font-bold text-[var(--sp-text-primary)]">{nextSession.title}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-[var(--sp-text-secondary)]">
                <CalendarDays aria-hidden="true" className="size-4" />
                {nextSession.status === 'inProgress' ? 'En cours' : formatLocalDate(nextSession.date)}
                {' · '}{nextSession.source === 'strength' ? 'Musculation' : 'Endurance'}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[var(--sp-text-secondary)]">
              Aucune prochaine séance prévue.
            </p>
          )}
          <PlanLink to={routePaths.weeklyPlanning} label="Voir le planning Sport" />
        </Card>
      </div>
    </section>
  );
}

export function CoachObjectiveCard({ snapshot }: { snapshot: CoachHubSnapshot }) {
  return (
    <Card padding="md" aria-labelledby="coach-hub-objective-title">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-[var(--sp-text-secondary)]">Objectif actuel</p>
          <h2 id="coach-hub-objective-title" className="mt-1 text-xl font-bold text-[var(--sp-text-primary)]">
            {orientationLabels[snapshot.orientation]}
          </h2>
        </div>
        <div className="border-t border-[var(--sp-border-subtle)] pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <p className="text-sm font-semibold text-[var(--sp-text-secondary)]">Phase Coach</p>
          {snapshot.coachPhase.status === 'available' ? (
            <>
              <p className="mt-1 text-xl font-bold text-[var(--sp-text-primary)]">
                {snapshot.coachPhase.phase.label}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--sp-text-secondary)]">
                {snapshot.coachPhase.phase.description}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm font-semibold text-[var(--sp-text-secondary)]">
              Phase Coach indisponible
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
