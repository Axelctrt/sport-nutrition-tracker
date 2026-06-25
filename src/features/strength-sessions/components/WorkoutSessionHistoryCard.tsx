import { CheckCircle2, CircleStop, Clock3, Dumbbell, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getWorkoutSessionTitle } from '@/application/strength/workoutSessionService';
import { workoutSessionPath } from '@/app/routePaths';
import type { WorkoutSessionSummaryWithProgression } from '@/features/strength-sessions/hooks/useWorkoutSessions';
import { workoutSessionStatusLabel } from '@/features/strength-sessions/utils/sessionLabels';
import { Card } from '@/shared/ui/Card';
import { formatLocalDate } from '@/shared/utils/dates';

export function WorkoutSessionHistoryCard({ summary }: { summary: WorkoutSessionSummaryWithProgression }) {
  const { session, exerciseCount, pendingProgressionCount } = summary;
  const completed = session.status === 'completed';

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words font-semibold text-slate-950 dark:text-white">{getWorkoutSessionTitle(session)}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatLocalDate(session.date)}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${completed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
          {completed ? <CheckCircle2 aria-hidden="true" className="size-3.5" /> : <CircleStop aria-hidden="true" className="size-3.5" />}
          {workoutSessionStatusLabel(session.status)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
          <Dumbbell aria-hidden="true" className="size-4 text-brand-700 dark:text-brand-300" />
          <p className="mt-1 font-semibold text-slate-950 dark:text-white">{exerciseCount}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">exercice{exerciseCount > 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
          <Clock3 aria-hidden="true" className="size-4 text-brand-700 dark:text-brand-300" />
          <p className="mt-1 font-semibold text-slate-950 dark:text-white">{session.durationMinutes ?? '—'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">minutes</p>
        </div>
        <div className="col-span-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70 sm:col-span-1">
          <TrendingUp aria-hidden="true" className="size-4 text-brand-700 dark:text-brand-300" />
          <p className="mt-1 font-semibold text-slate-950 dark:text-white">{pendingProgressionCount}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">à décider</p>
        </div>
      </div>

      {pendingProgressionCount > 0 ? (
        <p className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {pendingProgressionCount} progression{pendingProgressionCount > 1 ? 's' : ''} à décider
        </p>
      ) : null}
      {session.sourceTemplateNameSnapshot ? <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Modèle : {session.sourceTemplateNameSnapshot}</p> : null}

      <Link to={workoutSessionPath(session.id)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 sm:w-auto">
        {pendingProgressionCount > 0 ? 'Voir les suggestions' : 'Consulter la séance'}
      </Link>
    </Card>
  );
}
