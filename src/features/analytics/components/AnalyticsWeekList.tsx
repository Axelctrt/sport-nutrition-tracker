interface AnalyticsWeekItem {
  id: string;
  label: string;
  metrics: Array<{ label: string; value: string }>;
}

interface AnalyticsWeekListProps {
  items: AnalyticsWeekItem[];
  emptyMessage?: string;
}

export function AnalyticsWeekList({
  items,
  emptyMessage = 'Aucune donnée hebdomadaire disponible.',
}: AnalyticsWeekListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/60">
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Semaine du {item.label}</h3>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
            {item.metrics.map((metric) => (
              <div key={metric.label} className="min-w-0">
                <dt className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">{metric.label}</dt>
                <dd className="truncate text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  );
}
