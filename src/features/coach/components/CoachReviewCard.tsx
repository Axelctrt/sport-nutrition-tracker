import { ArrowRight, CalendarCheck2, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import type { CoachNextReview } from '@/domain/coach/coachState';
import type { CoachHubSnapshot } from '@/domain/coach/coachHub';
import { Card } from '@/shared/ui/Card';
import { formatLocalDate } from '@/shared/utils/dates';

const conditionLabels: Record<
  Extract<CoachNextReview, { type: 'condition' }>['condition'],
  string
> = {
  moreData: 'Lorsque davantage de données seront disponibles',
  foodTrackingImproved: 'Lorsque le suivi alimentaire sera suffisamment complet',
  temporaryContextResolved: 'Lorsque le contexte temporaire sera résolu',
  recoveryReassessed: 'Après réévaluation de la récupération',
};

function nextReviewLabel(nextReview: CoachNextReview | undefined): string {
  if (!nextReview) return 'Non disponible';
  return nextReview.type === 'date'
    ? formatLocalDate(nextReview.date)
    : conditionLabels[nextReview.condition];
}

export function CoachReviewCard({ snapshot }: { snapshot: CoachHubSnapshot }) {
  return (
    <section aria-labelledby="coach-hub-review-title">
      <h2 id="coach-hub-review-title" className="text-xl font-bold text-[var(--sp-text-primary)]">
        Bilans du Coach
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Card padding="md" aria-labelledby="coach-last-review-title">
          <h3 id="coach-last-review-title" className="flex items-center gap-2 font-bold text-[var(--sp-text-primary)]">
            <History aria-hidden="true" className="size-5 text-[var(--sp-accent-primary)]" />
            Dernier bilan
          </h3>
          {snapshot.lastReview ? (
            <p className="mt-3 text-sm leading-6 text-[var(--sp-text-secondary)]">
              Semaine du {formatLocalDate(snapshot.lastReview.weekStart)} au {formatLocalDate(snapshot.lastReview.weekEnd)}.
            </p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[var(--sp-text-secondary)]">
              Aucun bilan Coach disponible.
            </p>
          )}
          <Link to={routePaths.weeklyReview} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--sp-accent-primary)]">
            Ouvrir le Bilan
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Card>

        <Card padding="md" aria-labelledby="coach-next-review-title">
          <h3 id="coach-next-review-title" className="flex items-center gap-2 font-bold text-[var(--sp-text-primary)]">
            <CalendarCheck2 aria-hidden="true" className="size-5 text-[var(--sp-accent-primary)]" />
            Prochain bilan
          </h3>
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--sp-text-primary)]">
            {nextReviewLabel(snapshot.nextReview)}
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--sp-text-muted)]">
            Historique Coach disponible dans une prochaine version.
          </p>
        </Card>
      </div>
    </section>
  );
}
