import { CalendarDays } from 'lucide-react';
import type { WeeklyReview, WeeklyReviewDecisionStatus } from '@/domain/models/weeklyReview';
import { formatLocalDate } from '@/shared/utils/dates';

const statusLabels: Record<WeeklyReviewDecisionStatus, string> = {
  pending: 'Décision à prendre',
  accepted: 'Acceptée',
  rejected: 'Refusée',
  notEligible: 'Non proposée',
};

function formatSigned(value: number | undefined, unit: string): string {
  if (value === undefined) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${unit}`;
}

export function WeeklyReviewHistoryCard({ review }: { review: WeeklyReview }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
            {formatLocalDate(review.weekStart, 'd MMM')} – {formatLocalDate(review.weekEnd, 'd MMM yyyy')}
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {statusLabels[review.decisionStatus]}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <dt className="text-[11px] text-slate-500 dark:text-slate-400">Score</dt>
          <dd className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{review.adherenceScore}/100</dd>
        </div>
        <div>
          <dt className="text-[11px] text-slate-500 dark:text-slate-400">Évolution</dt>
          <dd className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{formatSigned(review.actualWeightChangeKg, 'kg')}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-slate-500 dark:text-slate-400">Proposition</dt>
          <dd className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{formatSigned(review.proposedAdjustmentKcal, 'kcal/j')}</dd>
        </div>
      </dl>
    </article>
  );
}
