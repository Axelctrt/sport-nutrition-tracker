import { Apple, Footprints, Scale, ShieldCheck } from 'lucide-react';
import type { WeeklyReview } from '@/domain/models/weeklyReview';
import { Card } from '@/shared/ui/Card';

interface WeeklyReviewSummaryProps {
  review: WeeklyReview;
}

function formatSigned(value: number | undefined, unit: string): string {
  if (value === undefined) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${unit}`;
}

export function WeeklyReviewSummary({ review }: WeeklyReviewSummaryProps) {
  const metrics = [
    {
      label: 'Poids moyen',
      value: review.averageWeightKg === undefined ? '—' : `${review.averageWeightKg.toLocaleString('fr-FR')} kg`,
      detail: `${review.weighInCount} pesée(s)`,
      icon: Scale,
    },
    {
      label: 'Évolution',
      value: formatSigned(review.actualWeightChangeKg, 'kg'),
      detail: `Cible ${formatSigned(review.targetWeightChangeKg, 'kg')}`,
      icon: Scale,
    },
    {
      label: 'Adhérence calories',
      value: review.calorieAdherencePercent === undefined ? '—' : `${Math.round(review.calorieAdherencePercent)} %`,
      detail: `${review.calorieComparableDays} jour(s) comparables`,
      icon: Apple,
    },
    {
      label: 'Score',
      value: `${review.adherenceScore}/100`,
      detail: `${review.stepGoalDays}/7 objectifs de pas`,
      icon: review.adherenceScore >= 75 ? ShieldCheck : Footprints,
    },
  ];

  return (
    <Card className="overflow-hidden" aria-labelledby="weekly-summary-title">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
        <h2 id="weekly-summary-title" className="font-semibold text-slate-950 dark:text-white">
          Résumé de la semaine
        </h2>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 dark:divide-slate-800 sm:grid-cols-4 sm:divide-y-0">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 p-3.5 sm:p-4">
            <metric.icon aria-hidden="true" className="size-4 text-slate-500 dark:text-slate-400" />
            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{metric.label}</p>
            <p className="mt-1 truncate text-lg font-bold tabular-nums text-slate-950 dark:text-white sm:text-xl">
              {metric.value}
            </p>
            <p className="mt-1 text-xs leading-4 text-slate-500 dark:text-slate-400">{metric.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
