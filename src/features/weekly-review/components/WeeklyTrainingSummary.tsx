import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Route,
} from 'lucide-react';

import type { WeeklyReviewInsights } from '@/domain/reviews/weeklyReviewInsights';
import { Card } from '@/shared/ui/Card';

interface WeeklyTrainingSummaryProps {
  insights: WeeklyReviewInsights;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining === 0 ? `${hours} h` : `${hours} h ${remaining}`;
}

function formatDistance(value: number, unit: string): string {
  return value > 0
    ? `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${unit}`
    : '—';
}

export function WeeklyTrainingSummary({
  insights,
}: WeeklyTrainingSummaryProps) {
  const { training } = insights;
  const metrics = [
    {
      label: 'Séances prévues',
      value: training.hasPlanning ? training.plannedSessions.toString() : '—',
      detail: training.hasPlanning
        ? `${training.pendingPlannedSessions} encore en attente`
        : 'Aucun planning enregistré',
      icon: CalendarDays,
    },
    {
      label: 'Séances réalisées',
      value: (
        training.hasPlanning
          ? training.completedPlannedSessions
          : training.actualSessions
      ).toString(),
      detail: training.hasPlanning
        ? `sur ${training.plannedSessions} prévues`
        : 'Activité(s) enregistrée(s)',
      icon: CheckCircle2,
    },
    {
      label: 'Adhérence planning',
      value: training.adherencePercent === undefined
        ? '—'
        : `${training.adherencePercent} %`,
      detail: training.hasPlanning
        ? `${training.skippedPlannedSessions} ignorée(s), ${training.abandonedPlannedSessions} interrompue(s)`
        : 'Non calculée sans planning',
      icon: Route,
    },
    {
      label: 'Durée enregistrée',
      value: formatDuration(training.activityMinutes),
      detail: `${training.strengthSessions} musculation · ${training.enduranceSessions} endurance`,
      icon: Clock3,
    },
  ];

  return (
    <Card className="overflow-hidden" aria-labelledby="weekly-training-title">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
        <div className="flex items-center gap-2">
          <Dumbbell
            aria-hidden="true"
            className="size-5 text-brand-700 dark:text-brand-300"
          />
          <h2
            id="weekly-training-title"
            className="font-semibold text-slate-950 dark:text-white"
          >
            Activité de la semaine
          </h2>
        </div>
        {!training.hasPlanning ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Aucun planning enregistré pour cette semaine. Les activités libres restent comptabilisées.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 dark:divide-slate-800 sm:grid-cols-4 sm:divide-y-0">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 p-3.5 sm:p-4">
            <metric.icon
              aria-hidden="true"
              className="size-4 text-slate-500 dark:text-slate-400"
            />
            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              {metric.label}
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-slate-950 dark:text-white sm:text-xl">
              {metric.value}
            </p>
            <p className="mt-1 text-xs leading-4 text-slate-500 dark:text-slate-400">
              {metric.detail}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-2 border-t border-slate-200 p-4 text-sm dark:border-slate-800 sm:grid-cols-3 sm:px-5">
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
          Course : <strong>{formatDistance(training.runningDistanceKm, 'km')}</strong>
        </p>
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
          Vélo : <strong>{formatDistance(training.cyclingDistanceKm, 'km')}</strong>
        </p>
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
          Natation : <strong>{formatDistance(training.swimmingDistanceMeters, 'm')}</strong>
        </p>
      </div>
    </Card>
  );
}
