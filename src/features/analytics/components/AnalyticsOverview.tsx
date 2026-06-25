import { Apple, Footprints, Scale, Waves } from 'lucide-react';
import { Card } from '@/shared/ui/Card';

interface AnalyticsOverviewProps {
  runningDistanceKm: number;
  runningSessions: number;
  swimmingDistanceMeters: number;
  swimmingSessions: number;
  calorieAdherencePercent: number | undefined;
  latestWeightKg: number | undefined;
  latestWeightWeighIns: number | undefined;
}

function formatDistance(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

export function AnalyticsOverview({
  runningDistanceKm,
  runningSessions,
  swimmingDistanceMeters,
  swimmingSessions,
  calorieAdherencePercent,
  latestWeightKg,
  latestWeightWeighIns,
}: AnalyticsOverviewProps) {
  const metrics = [
    {
      label: 'Course',
      value: `${formatDistance(runningDistanceKm)} km`,
      detail: `${runningSessions} séance(s)`,
      icon: Footprints,
      tone: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
    },
    {
      label: 'Natation',
      value: `${formatDistance(swimmingDistanceMeters / 1000)} km`,
      detail: `${swimmingSessions} séance(s)`,
      icon: Waves,
      tone: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
    },
    {
      label: 'Adhérence calories',
      value: calorieAdherencePercent === undefined ? '—' : `${Math.round(calorieAdherencePercent)} %`,
      detail: 'Marge de ±10 %',
      icon: Apple,
      tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    },
    {
      label: 'Poids récent',
      value: latestWeightKg === undefined ? '—' : `${latestWeightKg.toLocaleString('fr-FR')} kg`,
      detail: latestWeightKg === undefined ? 'Aucune moyenne' : `${latestWeightWeighIns ?? 0} pesée(s)`,
      icon: Scale,
      tone: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
    },
  ];

  return (
    <Card className="mt-5 overflow-hidden" aria-labelledby="analytics-overview-title">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
        <h2 id="analytics-overview-title" className="font-semibold text-slate-950 dark:text-white">
          Vue d’ensemble sur 12 semaines
        </h2>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 dark:divide-slate-800 sm:grid-cols-4 sm:divide-y-0">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 p-3.5 sm:p-4">
            <span className={`grid size-9 place-items-center rounded-xl ${metric.tone}`}>
              <metric.icon aria-hidden="true" className="size-4.5" />
            </span>
            <p className="mt-3 text-xs font-medium leading-4 text-slate-500 dark:text-slate-400">
              {metric.label}
            </p>
            <p className="mt-1 truncate text-lg font-bold tabular-nums text-slate-950 dark:text-white sm:text-xl">
              {metric.value}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{metric.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
