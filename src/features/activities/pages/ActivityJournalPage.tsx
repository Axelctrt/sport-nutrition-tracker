import { Bike, CalendarDays, Dumbbell, Layers3, PlayCircle, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import { ActivityJournalCard } from '@/features/activities/components/ActivityJournalCard';
import { ActivityJournalSummary } from '@/features/activities/components/ActivityJournalSummary';
import { useActivityJournal } from '@/features/activities/hooks/useActivityJournal';
import {
  createActivityJournalReturnState,
  type ActivityJournalNavigationState,
} from '@/features/activities/navigation/activityJournalNavigation';
import { presentActivity } from '@/features/activities/utils/activityPresentation';
import { inputClassName } from '@/shared/forms/formStyles';
import { useToast } from '@/shared/toast/useToast';
import { Button } from '@/shared/ui/Button';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';
import { isValidLocalDate } from '@/shared/validation/localDate';

export function ActivityJournalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const handledFeedbackRef = useRef<string | undefined>(undefined);
  const highlightTimerRef = useRef<number | undefined>(undefined);
  const locationState = location.state as ActivityJournalNavigationState | null;
  const requestedDate = searchParams.get('date') ?? '';
  const date = isValidLocalDate(requestedDate) ? requestedDate : toLocalDate();
  const {
    activities,
    status,
    errorMessage,
    busyId,
    refresh,
    duplicate,
    remove,
  } = useActivityJournal(date);
  const [highlightedActivityId, setHighlightedActivityId] = useState<string>();
  const totalDuration = activities.reduce((sum, activity) => sum + activity.durationMinutes, 0);
  const totalCalories = activities.reduce((sum, activity) => sum + presentActivity(activity).caloriesKcal, 0);
  const currentJournalPath = `${location.pathname}${location.search}`;

  const navigationState = useMemo(
    () => createActivityJournalReturnState(currentJournalPath, location.key, date),
    [currentJournalPath, date, location.key],
  );

  const highlightActivity = (activityId: string) => {
    if (highlightTimerRef.current !== undefined) {
      window.clearTimeout(highlightTimerRef.current);
    }
    setHighlightedActivityId(activityId);
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedActivityId(undefined);
      highlightTimerRef.current = undefined;
    }, 2_500);
  };

  useEffect(() => () => {
    if (highlightTimerRef.current !== undefined) {
      window.clearTimeout(highlightTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!highlightedActivityId || status !== 'ready') return;
    window.requestAnimationFrame(() => {
      document.getElementById(`activity-entry-${highlightedActivityId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  }, [activities.length, highlightedActivityId, status]);

  useEffect(() => {
    const feedback = locationState?.activityJournalFeedback;
    if (!feedback) return;
    const feedbackKey = `${feedback.title}:${feedback.activityId ?? date}`;
    if (handledFeedbackRef.current === feedbackKey) return;
    handledFeedbackRef.current = feedbackKey;
    toast.success(feedback.title);
    if (feedback.activityId) {
      highlightActivity(feedback.activityId);
    }
    void navigate(currentJournalPath, { replace: true, state: null });
  }, [currentJournalPath, date, locationState, navigate, toast]);

  const handleDuplicate = async (activityId: string) => {
    const created = await duplicate(activityId);
    if (!created) return;
    toast.success('Activité dupliquée');
    highlightActivity(created.id);
  };

  const handleRemove = async (activityId: string) => {
    const removed = await remove(activityId);
    if (removed) {
      toast.success('Activité supprimée');
    }
    return removed;
  };

  return (
    <section className="min-w-0" aria-labelledby="activity-journal-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Suivi sportif</p>
          <h1 id="activity-journal-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Activités
          </h1>
          <p className="mt-2 hidden max-w-2xl text-slate-600 dark:text-slate-300 sm:block">
            Retrouve les séances de la journée et ajuste-les sans perdre ta position.
          </p>
        </div>

        <div className="grid w-full min-w-0 gap-3 sm:w-auto sm:grid-cols-[12rem_auto] sm:items-end">
          <div className="min-w-0">
            <label htmlFor="activity-journal-date" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Journée consultée
            </label>
            <input
              id="activity-journal-date"
              type="date"
              value={date}
              onChange={(event) => setSearchParams({ date: event.target.value })}
              className={`${inputClassName} mt-2`}
            />
          </div>
          <Link
            to={routePaths.addActivity}
            state={navigationState}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 font-semibold text-white shadow-sm hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            <Plus aria-hidden="true" className="size-5" />
            Ajouter
          </Link>
        </div>
      </div>

      {errorMessage ? (
        <InlineNotice className="mt-5" tone="error" title="Opération impossible" role="alert">
          <p>{errorMessage}</p>
          {status === 'error' ? (
            <Button className="mt-3" variant="secondary" onClick={() => void refresh()}>
              Réessayer
            </Button>
          ) : null}
        </InlineNotice>
      ) : null}

      {status === 'loading' ? <PageSkeleton className="mt-6" variant="list" /> : null}

      {status === 'ready' ? (
        <>
          <ActivityJournalSummary
            activityCount={activities.length}
            totalDurationMinutes={totalDuration}
            totalCaloriesKcal={totalCalories}
          />

          {activities.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={CalendarDays}
              title={`Aucune activité le ${formatLocalDate(date)}`}
              description="Ajoute une course, une natation, du vélo ou une autre séance pour compléter ta journée."
              primaryAction={(
                <Link
                  to={routePaths.addActivity}
                  state={navigationState}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Ajouter une activité
                </Link>
              )}
            />
          ) : (
            <div className="mt-4 space-y-3">
              {activities.map((activity) => (
                <ActivityJournalCard
                  key={activity.id}
                  activity={activity}
                  navigationState={navigationState}
                  highlighted={highlightedActivityId === activity.id}
                  busyId={busyId}
                  onDuplicate={handleDuplicate}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}

          <CollapsibleSection
            className="mt-4"
            title="Endurance"
            description="Modèles simples et analyses de course, natation et vélo"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                to={routePaths.enduranceTemplates}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                <Layers3 aria-hidden="true" className="size-4" />
                Modèles d’endurance
              </Link>
              <Link
                to={routePaths.analytics}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <Bike aria-hidden="true" className="size-4" />
                Voir les analyses
              </Link>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            className="mt-4"
            title="Musculation"
            description="Carnet détaillé, modèles et catalogue d’exercices"
          >
            <div className="grid gap-2 sm:grid-cols-3">
              <Link
                to={routePaths.workoutSessions}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
              >
                <PlayCircle aria-hidden="true" className="size-4" />
                Carnet
              </Link>
              <Link
                to={routePaths.workoutTemplates}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <Layers3 aria-hidden="true" className="size-4" />
                Modèles
              </Link>
              <Link
                to={routePaths.strengthExercises}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <Dumbbell aria-hidden="true" className="size-4" />
                Exercices
              </Link>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            className="mt-4"
            title="À propos des calories"
            description="Comprendre l’estimation utilisée dans le journal"
          >
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Les calories servent au pilotage quotidien. Elles restent une estimation et peuvent être corrigées manuellement dans chaque activité.
            </p>
            <Link
              to={routePaths.calculationsInformation}
              className="mt-3 inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
            >
              Voir le détail des calculs
            </Link>
          </CollapsibleSection>
        </>
      ) : null}
    </section>
  );
}
