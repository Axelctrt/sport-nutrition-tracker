import { Activity, Clock3, Flame } from 'lucide-react';
import { Card } from '@/shared/ui/Card';

interface ActivityJournalSummaryProps {
  activityCount: number;
  totalDurationMinutes: number;
  totalCaloriesKcal: number;
}

export function ActivityJournalSummary({
  activityCount,
  totalDurationMinutes,
  totalCaloriesKcal,
}: ActivityJournalSummaryProps) {
  return (
    <Card className="p-4 sm:p-5" role="group" aria-label="Résumé des activités de la journée">
      <dl className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800">
        <div className="min-w-0 px-2 text-center first:pl-0 sm:px-4">
          <dt className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Activity aria-hidden="true" className="size-4 shrink-0" />
            <span>Séances</span>
          </dt>
          <dd className="mt-2 text-lg font-bold tabular-nums text-slate-950 dark:text-white">
            {activityCount}
          </dd>
        </div>
        <div className="min-w-0 px-2 text-center sm:px-4">
          <dt className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Clock3 aria-hidden="true" className="size-4 shrink-0" />
            <span>Durée</span>
          </dt>
          <dd className="mt-2 text-lg font-bold tabular-nums text-slate-950 dark:text-white">
            {totalDurationMinutes} min
          </dd>
        </div>
        <div className="min-w-0 px-2 text-center last:pr-0 sm:px-4">
          <dt className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Flame aria-hidden="true" className="size-4 shrink-0" />
            <span>Calories</span>
          </dt>
          <dd className="mt-2 text-lg font-bold tabular-nums text-slate-950 dark:text-white">
            {Math.round(totalCaloriesKcal)} kcal
          </dd>
        </div>
      </dl>
    </Card>
  );
}
