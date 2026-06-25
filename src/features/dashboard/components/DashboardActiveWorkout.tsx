import { Dumbbell, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getWorkoutSessionTitle } from '@/application/strength/workoutSessionService';
import { workoutSessionPath } from '@/app/routePaths';
import type { ActiveWorkoutSummary } from '@/features/dashboard/hooks/useDailyDashboard';
import { Card } from '@/shared/ui/Card';

export function DashboardActiveWorkout({ workout }: { workout: ActiveWorkoutSummary }) {
  return (
    <Card className="mt-5 border-brand-300 bg-brand-50/80 p-4 dark:border-brand-800 dark:bg-brand-950/30">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-100">
          <Dumbbell aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Séance en cours
          </p>
          <h2 className="mt-0.5 truncate text-lg font-bold text-slate-950 dark:text-white">
            {getWorkoutSessionTitle(workout.session)}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {workout.exerciseCount} exercice{workout.exerciseCount > 1 ? 's' : ''} dans le carnet
          </p>
        </div>
      </div>
      <Link
        to={workoutSessionPath(workout.session.id)}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500"
      >
        <Play aria-hidden="true" className="size-4" />
        Reprendre la séance
      </Link>
    </Card>
  );
}
