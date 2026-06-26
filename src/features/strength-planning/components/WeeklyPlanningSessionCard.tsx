import { CalendarClock, CheckCircle2, CircleStop, Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { LocalDate } from '@/domain/models/common';
import type { WorkoutSessionSummary } from '@/application/strength/workoutSessionService';
import { getWorkoutSessionTitle } from '@/application/strength/workoutSessionService';
import { planningDateForSession } from '@/application/strength/weeklyPlanningService';
import { workoutSessionPath } from '@/app/routePaths';
import { workoutSessionStatusLabel } from '@/features/strength-sessions/utils/sessionLabels';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { formatLocalDate } from '@/shared/utils/dates';

interface Props {
  summary: WorkoutSessionSummary;
  busy: boolean;
  onStart: (sessionId: string) => void;
  onReschedule: (sessionId: string, date: LocalDate) => Promise<boolean>;
  onSkip: (sessionId: string) => Promise<boolean>;
}

const statusClasses = {
  planned: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  inProgress: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  abandoned: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  skipped: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
} as const;

export function WeeklyPlanningSessionCard({
  summary,
  busy,
  onStart,
  onReschedule,
  onSkip,
}: Props) {
  const { session, exerciseCount } = summary;
  const [showReschedule, setShowReschedule] = useState(false);
  const [nextDate, setNextDate] = useState<LocalDate>(() => planningDateForSession(session));
  const [confirmSkip, setConfirmSkip] = useState(false);
  const plannedDate = planningDateForSession(session);
  const actualDateDiffers = session.plannedDate !== undefined && session.date !== session.plannedDate;

  const submitReschedule = async () => {
    if (await onReschedule(session.id, nextDate)) setShowReschedule(false);
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words font-semibold text-slate-950 dark:text-white">{getWorkoutSessionTitle(session)}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {exerciseCount} exercice{exerciseCount > 1 ? 's' : ''}
          </p>
        </div>
        <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[session.status]}`}>
          {workoutSessionStatusLabel(session.status)}
        </span>
      </div>

      {actualDateDiffers ? (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Prévue le {formatLocalDate(plannedDate)} · réalisée le {formatLocalDate(session.date)}
        </p>
      ) : null}
      {session.originalPlannedDate && session.originalPlannedDate !== plannedDate ? (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Initialement prévue le {formatLocalDate(session.originalPlannedDate)}
        </p>
      ) : null}

      {session.status === 'planned' ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button size="sm" disabled={busy} onClick={() => onStart(session.id)}>
            <Play aria-hidden="true" className="size-4" />Démarrer
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setShowReschedule((current) => !current)}>
            <CalendarClock aria-hidden="true" className="size-4" />Reporter
          </Button>
          <Button className="col-span-2" size="sm" variant="dangerGhost" disabled={busy} onClick={() => setConfirmSkip(true)}>
            <CircleStop aria-hidden="true" className="size-4" />Non réalisée
          </Button>
        </div>
      ) : null}

      {showReschedule && session.status === 'planned' ? (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
          <label htmlFor={`reschedule-${session.id}`} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Nouvelle date
          </label>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              id={`reschedule-${session.id}`}
              type="date"
              value={nextDate}
              onChange={(event) => setNextDate(event.target.value)}
              className={inputClassName}
            />
            <Button size="sm" disabled={busy || !nextDate} onClick={() => void submitReschedule()}>
              <RotateCcw aria-hidden="true" className="size-4" />Confirmer
            </Button>
          </div>
        </div>
      ) : null}

      {session.status === 'inProgress' ? (
        <Link to={workoutSessionPath(session.id)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 sm:w-auto">
          <Play aria-hidden="true" className="size-4" />Reprendre
        </Link>
      ) : null}

      {session.status === 'completed' || session.status === 'abandoned' ? (
        <Link to={workoutSessionPath(session.id)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 sm:w-auto">
          {session.status === 'completed' ? <CheckCircle2 aria-hidden="true" className="size-4" /> : <CircleStop aria-hidden="true" className="size-4" />}
          Consulter
        </Link>
      ) : null}

      <ConfirmationDialog
        open={confirmSkip}
        title="Marquer la séance comme non réalisée ?"
        description={`${getWorkoutSessionTitle(session)} restera visible dans le planning du ${formatLocalDate(plannedDate)}.`}
        confirmLabel="Marquer comme non réalisée"
        tone="danger"
        isPending={busy}
        onCancel={() => setConfirmSkip(false)}
        onConfirm={() => {
          void onSkip(session.id).then((success) => {
            if (success) setConfirmSkip(false);
          });
        }}
      />
    </article>
  );
}
