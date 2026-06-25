import { CalendarDays, CheckCircle2, CircleStop, Dumbbell, Layers3, LoaderCircle, Play, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getWorkoutSessionTitle } from '@/application/strength/workoutSessionService';
import { routePaths, workoutSessionPath } from '@/app/routePaths';
import { useWorkoutSessions } from '@/features/strength-sessions/hooks/useWorkoutSessions';
import { workoutSessionStatusLabel } from '@/features/strength-sessions/utils/sessionLabels';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { formatLocalDate } from '@/shared/utils/dates';

export function WorkoutSessionsPage() {
  const navigate = useNavigate();
  const { sessions, status, errorMessage, isStarting, refresh, startEmpty } = useWorkoutSessions();
  const current = sessions.find(({ session }) => session.status === 'inProgress');
  const history = sessions.filter(({ session }) => session.status !== 'inProgress');

  const startFreeSession = async () => {
    const created = await startEmpty();
    if (created) await navigate(workoutSessionPath(created.session.id));
  };

  return (
    <section aria-labelledby="workout-sessions-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Carnet de musculation</p>
          <h1 id="workout-sessions-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Mes entraînements</h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">Démarre une séance libre ou utilise un modèle. Une séance en cours reste disponible après fermeture de l’application.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link to={routePaths.workoutTemplates} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
            <Layers3 aria-hidden="true" className="size-5" />Séances modèles
          </Link>
          <Button size="lg" disabled={isStarting || Boolean(current)} onClick={() => void startFreeSession()}>
            <Plus aria-hidden="true" className="size-5" />{isStarting ? 'Démarrage…' : 'Séance libre'}
          </Button>
        </div>
      </div>

      {errorMessage ? <InlineNotice className="mt-6" tone="error" title="Action impossible"><p>{errorMessage}</p><Button className="mt-3" variant="secondary" onClick={() => void refresh()}>Réessayer</Button></InlineNotice> : null}
      {status === 'loading' ? <Card className="mt-6 p-8 text-center" role="status"><LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-brand-700" /><p className="mt-3 font-semibold">Chargement des séances…</p></Card> : null}

      {status === 'ready' && current ? (
        <Card className="mt-8 border-brand-300 p-5 sm:p-6 dark:border-brand-800">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Séance en cours</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{getWorkoutSessionTitle(current.session)}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{current.exerciseCount} exercice{current.exerciseCount > 1 ? 's' : ''} · démarrée le {formatLocalDate(current.session.date)}</p>
            </div>
            <Link to={workoutSessionPath(current.session.id)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 font-semibold text-white hover:bg-brand-800">
              <Play aria-hidden="true" className="size-5" />Reprendre la séance
            </Link>
          </div>
        </Card>
      ) : null}

      {status === 'ready' && !current ? (
        <InlineNotice className="mt-8" title="Aucune séance en cours">
          Démarre une séance libre ou ouvre une séance modèle pour commencer un nouvel entraînement.
        </InlineNotice>
      ) : null}

      <div className="mt-10 flex items-center gap-3">
        <CalendarDays aria-hidden="true" className="size-6 text-brand-700 dark:text-brand-300" />
        <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Historique récent</h2>
      </div>

      {status === 'ready' && history.length === 0 ? (
        <Card className="mt-5 p-8 text-center"><Dumbbell aria-hidden="true" className="mx-auto size-10 text-slate-400" /><p className="mt-3 font-semibold text-slate-900 dark:text-white">Aucune séance terminée pour le moment.</p></Card>
      ) : null}

      {status === 'ready' && history.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {history.map(({ session, exerciseCount, pendingProgressionCount }) => (
            <Card key={session.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{getWorkoutSessionTitle(session)}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatLocalDate(session.date)} · {exerciseCount} exercice{exerciseCount > 1 ? 's' : ''}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${session.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                  {session.status === 'completed' ? <CheckCircle2 aria-hidden="true" className="size-3.5" /> : <CircleStop aria-hidden="true" className="size-3.5" />}
                  {workoutSessionStatusLabel(session.status)}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600 dark:text-slate-300">
                {session.durationMinutes !== undefined ? <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">{session.durationMinutes} min</span> : null}
                {session.sourceTemplateNameSnapshot ? <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">Modèle : {session.sourceTemplateNameSnapshot}</span> : null}
                {pendingProgressionCount > 0 ? (
                  <span className="rounded-lg bg-emerald-100 px-2.5 py-1.5 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    {pendingProgressionCount} progression{pendingProgressionCount > 1 ? 's' : ''} à décider
                  </span>
                ) : null}
              </div>
              <Link to={workoutSessionPath(session.id)} className="mt-4 inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                {pendingProgressionCount > 0 ? 'Voir les suggestions' : 'Consulter'}
              </Link>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}
