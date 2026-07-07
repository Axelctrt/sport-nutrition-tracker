import type { SocialActivityMetricPresentation } from '@/features/friends/components/socialActivityFeedPresentation';
import { cn } from '@/shared/utils/cn';

interface SocialActivitySummaryMetricsProps {
  readonly metrics: readonly SocialActivityMetricPresentation[];
  readonly variant?: 'card' | 'detail';
}

export function SocialActivitySummaryMetrics({
  metrics,
  variant = 'card',
}: SocialActivitySummaryMetricsProps) {
  if (metrics.length === 0) return null;

  if (variant === 'card') {
    return (
      <dl className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Résumé de l’activité">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className={cn(
              'min-w-0 rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800',
              'sm:min-w-28',
            )}
          >
            <dt className="truncate text-[0.68rem] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {metric.label}
            </dt>
            <dd className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-white">
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Métriques partagées">
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className={cn(
            'min-w-0 rounded-2xl border border-slate-200 p-3 dark:border-slate-800',
            metric.primary && 'bg-brand-50/70 dark:bg-brand-950/30',
          )}
        >
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {metric.label}
          </dt>
          <dd className="mt-1 break-words text-base font-bold text-slate-950 dark:text-white">
            {metric.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
