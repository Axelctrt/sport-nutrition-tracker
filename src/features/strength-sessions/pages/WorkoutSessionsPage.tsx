import { CalendarDays, Dumbbell, Layers3, Play, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getWorkoutSessionTitle } from '@/application/strength/workoutSessionService';
import { routePaths, workoutSessionPath } from '@/app/routePaths';
import { WorkoutSessionHistoryCard } from '@/features/strength-sessions/components/WorkoutSessionHistoryCard';
import { WorkoutSessionsSummary } from '@/features/strength-sessions/components/WorkoutSessionsSummary';
import { useWorkoutSessions } from '@/features/strength-sessions/hooks/useWorkoutSessions';
import type { WorkoutSessionNavigationState } from '@/features/strength-sessions/navigation/workoutSessionNavigation';
import { useActionToast } from '@/shared/toast/useActionToast';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { formatLocalDate } from '@/shared/utils/dates';

type SessionFilter = 'all' | 'completed' | 'abandoned';

export function WorkoutSessionsPage() {
  const actionToast = useActionToast();
  const location = useLocation();
  const navigate = useNavigate();
  const handledCompletionRef = useRef<string>();
  const [filter, setFilter] = useState<SessionFilter>('all');
  const { sessions, status, errorMessage, isStarting, refresh, startEmpty } = useWorkoutSessions();
  const current = sessions.find(({ session }) => session.status === 'inProgress');
  const archivedSessions = useMemo(
    () => sessions.filter(({ session }) => session.status === 'completed' || session.status === 'abandoned'),
    [sessions],
  );
  const history = useMemo(
    () => archivedSessions.filter(({ session }) => filter === 'all' || session.status === filter),
    [archivedSessions, filter],
  );

  useEffect(() => {
    const feedback = (location.state as WorkoutSessionNavigationState | null)?.workoutSessionFeedback;
    if (!feedback || handledCompletionRef.current === feedback.sessionId) return;
    handledCompletionRef.current = feedback.sessionId;
    actionToast.success({
      key: `workout-session-complete:${feedback.sessionId}`,
      title: feedback.title,
      description: feedback.description,
    });
    void navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [actionToast, location.pathname, location.search, location.state, navigate]);

  const startFreeSession = async () => {
    const created = await startEmpty();
    if (created) {
      actionToast.success({ key: `workout-session-start:${created.session.id}`, title: 'Séance libre démarrée' });
      await navigate(workoutSessionPath(created.session.id));
    }
  };

  return (
    <section aria-labelledby="workout-sessions-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Carnet de musculation</p>
          <h1 id="workout-sessions-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Mes entraînements</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">Reprends la séance active ou consulte rapidement les entraînements déjà réalisés.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link to={routePaths.weeklyPlanning} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"><CalendarDays aria-hidden="true" className="size-4" />Planning</Link>
          <Link to={routePaths.workoutTemplates} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"><Layers3 aria-hidden="true" className="size-4" />Modèles</Link>
          <Button size="lg" disabled={isStarting || Boolean(current)} onClick={() => void startFreeSession()}><Plus aria-hidden="true" className="size-4" />{isStarting ? 'Démarrage…' : 'Séance libre'}</Button>
        </div>
      </div>

      {errorMessage ? <InlineNotice className="mt-5" tone="error" title="Action impossible"><p>{errorMessage}</p><Button className="mt-3" variant="secondary" onClick={() => void refresh()}>Réessayer</Button></InlineNotice> : null}
      {status === 'loading' ? <PageSkeleton className="mt-6" variant="list" /> : null}
      {status === 'ready' ? <WorkoutSessionsSummary sessions={sessions} /> : null}

      {status === 'ready' && current ? (
        <Card className="mt-4 border-brand-300 p-4 sm:p-5 dark:border-brand-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Séance en cours</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{getWorkoutSessionTitle(current.session)}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{current.exerciseCount} exercice{current.exerciseCount > 1 ? 's' : ''} · {formatLocalDate(current.session.date)}</p>
            </div>
            <Link to={workoutSessionPath(current.session.id)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 font-semibold text-white hover:bg-brand-800"><Play aria-hidden="true" className="size-5" />Reprendre la séance</Link>
          </div>
        </Card>
      ) : null}

      {status === 'ready' && !current ? <InlineNotice className="mt-4" title="Aucune séance en cours">Démarre une séance libre ou utilise un modèle préparé.</InlineNotice> : null}

      {status === 'ready' ? (
        <div className="mt-7">
          <div>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Historique récent</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Séances terminées ou abandonnées.</p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Filtrer les entraînements">
            {([['all', 'Toutes'], ['completed', 'Terminées'], ['abandoned', 'Abandonnées']] as const).map(([value, label]) => (
              <Button key={value} size="sm" variant={filter === value ? 'primary' : 'secondary'} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</Button>
            ))}
          </div>
        </div>
      ) : null}

      {status === 'ready' && history.length === 0 ? (
        <EmptyState
          className="mt-5"
          variant={archivedSessions.length === 0 ? 'first-use' : 'filtered'}
          icon={Dumbbell}
          title={archivedSessions.length === 0 ? 'Aucun entraînement enregistré' : 'Aucune séance dans ce filtre'}
          description={archivedSessions.length === 0
            ? 'Tes séances terminées ou abandonnées apparaîtront ici après leur enregistrement.'
            : 'Ton historique est intact. Affiche toutes les séances pour le retrouver.'}
          primaryAction={archivedSessions.length === 0
            ? <Button onClick={() => void startFreeSession()} disabled={isStarting || Boolean(current)}>{isStarting ? 'Démarrage…' : 'Démarrer une séance libre'}</Button>
            : <Button variant="secondary" onClick={() => setFilter('all')}>Afficher toutes les séances</Button>}
        />
      ) : null}

      {status === 'ready' && history.length > 0 ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {history.map((summary) => <WorkoutSessionHistoryCard key={summary.session.id} summary={summary} />)}
        </div>
      ) : null}
    </section>
  );
}
