import { Link } from 'react-router-dom';
import { editActivityPath, routePaths } from '@/app/routePaths';
import type { Activity } from '@/domain/models/activity';
import { presentActivity } from '@/features/activities/utils/activityPresentation';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';

function rounded(value: number): number {
  return Math.round(value);
}

export function DashboardActivities({ activities, date }: { activities: Activity[]; date: string }) {
  if (activities.length === 0) return null;

  return (
    <CollapsibleSection
      className="mt-5"
      title="Activités du jour"
      description="Course, natation, vélo et autres activités enregistrées."
      summary={`${activities.length}`}
    >
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {activities.map((activity) => {
          const presentation = presentActivity(activity);
          return (
            <div
              key={activity.id}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <Link
                  to={editActivityPath(activity.id)}
                  className="block truncate font-semibold text-slate-950 hover:text-brand-700 dark:text-white dark:hover:text-brand-300"
                >
                  {presentation.title}
                </Link>
                <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                  {presentation.subtitle} · {activity.durationMinutes} min
                </p>
              </div>
              <p className="shrink-0 font-bold tabular-nums text-slate-950 dark:text-white">
                {rounded(presentation.caloriesKcal)} kcal
              </p>
            </div>
          );
        })}
      </div>
      <Link
        to={`${routePaths.activities}?date=${encodeURIComponent(date)}`}
        className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
      >
        Ouvrir le journal d’activités
      </Link>
    </CollapsibleSection>
  );
}
