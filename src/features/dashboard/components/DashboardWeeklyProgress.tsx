import { ArrowRight, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { UserProfile } from '@/domain/models/profile';
import { routePaths } from '@/app/routePaths';
import type { ProgressionHubSummary } from '@/application/progression/progressionHubSummaryService';
import { useProgressionHubSummary } from '@/features/progression/hooks/useProgressionHubSummary';
import { Card } from '@/shared/ui/Card';
import { toLocalDate } from '@/shared/utils/dates';

interface DashboardWeeklyProgressProps {
  profile: UserProfile;
}

function weightLabel(weight: ProgressionHubSummary['weight']): string {
  if (weight.state === 'empty') return 'aucune donnée';
  if (weight.state === 'insufficient') return 'tendance à confirmer';
  if (weight.state === 'aligned') return 'dans le sens de l’objectif';
  if (weight.state === 'stable') return 'tendance stable';
  return 'tendance à surveiller';
}

function waistLabel(review: ProgressionHubSummary['review']): string {
  const trend = review.waistTrendCmPerWeek;
  if (trend === undefined) return 'données insuffisantes';
  if (Math.abs(trend) < 0.1) return 'tendance stable';
  return trend < 0 ? 'en baisse' : 'en hausse';
}

function trackingLabel(review: ProgressionHubSummary['review']): string {
  return review.state === 'empty' || review.state === 'insufficient'
    ? 'à compléter'
    : 'suffisamment complet';
}

export function DashboardWeeklyProgress({
  profile,
}: DashboardWeeklyProgressProps) {
  const summary = useProgressionHubSummary(toLocalDate(), profile);

  return (
    <section className="mt-5" aria-labelledby="dashboard-weekly-progress-title">
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
            <BarChart3 aria-hidden="true" className="size-5" />
          </span>
          <h2
            id="dashboard-weekly-progress-title"
            className="font-bold text-slate-950 dark:text-white"
          >
            Cette semaine
          </h2>
        </div>

        {summary.status === 'loading' || !summary.data ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Calcul de la tendance…
          </p>
        ) : null}

        {summary.status === 'error' ? (
          <p className="mt-3 text-sm text-rose-700 dark:text-rose-300" role="alert">
            {summary.errorMessage}
          </p>
        ) : null}

        {summary.data ? (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Poids</dt>
              <dd className="font-semibold text-slate-950 dark:text-white">
                {weightLabel(summary.data.weight)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Tour de taille</dt>
              <dd className="font-semibold text-slate-950 dark:text-white">
                {waistLabel(summary.data.review)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Suivi</dt>
              <dd className="font-semibold text-slate-950 dark:text-white">
                {trackingLabel(summary.data.review)}
              </dd>
            </div>
          </dl>
        ) : null}

        <Link
          to={routePaths.progression}
          className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
        >
          Voir ma progression
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </Card>
    </section>
  );
}
