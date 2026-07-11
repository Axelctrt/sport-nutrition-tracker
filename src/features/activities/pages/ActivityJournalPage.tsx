import { CalendarDays, Info, Plus } from 'lucide-react';
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
import { SportHubOverview } from '@/features/sport/components/SportHubOverview';
import { SportStartSheet } from '@/features/sport/components/SportStartSheet';
import { useSportHub } from '@/features/sport/hooks/useSportHub';
import { inputClassName } from '@/shared/forms/formStyles';
import { useToast } from '@/shared/toast/useToast';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { RefreshStatus } from '@/shared/ui/RefreshStatus';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';
import { isValidLocalDate } from '@/shared/validation/localDate';

const defaultActivityTypeOrder = [
  'running',
  'strengthTraining',
  'walking',
  'cycling',
  'swimming',
  'otherCardio',
] as const;

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
  const [startSheetOpen, setStartSheetOpen] = useState(false);
  const {
    activities,
    status: journalStatus,
    errorMessage: journalErrorMessage,
    busyId,
    refresh: refreshJournal,
    duplicate,
    remove,
  } = useActivityJournal(date);
  const {
    status: hubStatus,
    snapshot,
    errorMessage: hubErrorMessage,
    isRefreshing: hubRefreshing,
    refresh: refreshHub,
  } = useSportHub();
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
    if (!highlightedActivityId || journalStatus !== 'ready') return;
    window.requestAnimationFrame(() => {
      document.getElementById(`activity-entry-${highlightedActivityId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  }, [activities.length, highlightedActivityId, journalStatus]);

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
    void refreshHub(false);
  }, [currentJournalPath, date, locationState, navigate, refreshHub, toast]);

  const handleDuplicate = async (activityId: string) => {
    const created = await duplicate(activityId);
    if (!created) return;
    toast.success('Activité dupliquée');
    highlightActivity(created.id);
    await refreshHub(false);
  };

  const handleRemove = async (activityId: string) => {
    const removed = await remove(activityId);
    if (removed) {
      toast.success('Activité supprimée');
      await refreshHub(false);
    }
    return removed;
  };

  return (
    <section className="min-w-0" aria-labelledby="sport-hub-title">
      <div className="min-w-0">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Entraînement
        </p>
        <h1 id="sport-hub-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Sport
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
          Démarre ta prochaine activité et retrouve immédiatement ce que tu as déjà réalisé.
        </p>
      </div>

      {hubRefreshing ? (
        <RefreshStatus visible className="mt-4" label="Actualisation du hub Sport…" />
      ) : null}

      {hubErrorMessage ? (
        <InlineNotice className="mt-5" tone="error" title="Hub Sport partiellement indisponible" role="alert">
          <p>{hubErrorMessage}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void refreshHub(hubStatus !== 'ready')}>
            Réessayer
          </Button>
        </InlineNotice>
      ) : null}

      {hubStatus === 'loading' && !snapshot ? (
        <PageSkeleton className="mt-6" variant="dashboard" />
      ) : null}

      {snapshot ? (
        <SportHubOverview
          snapshot={snapshot}
          navigationState={navigationState}
          onStart={() => setStartSheetOpen(true)}
        />
      ) : null}

      <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Historique
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Activités du {formatLocalDate(date)}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Consulte, modifie ou duplique les activités de cette journée.
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
            <Button size="lg" variant="secondary" onClick={() => setStartSheetOpen(true)}>
              <Plus aria-hidden="true" className="size-5" />
              Ajouter
            </Button>
          </div>
        </div>

        {journalErrorMessage ? (
          <InlineNotice className="mt-5" tone="error" title="Opération impossible" role="alert">
            <p>{journalErrorMessage}</p>
            {journalStatus === 'error' ? (
              <Button className="mt-3" variant="secondary" onClick={() => void refreshJournal()}>
                Réessayer
              </Button>
            ) : null}
          </InlineNotice>
        ) : null}

        {journalStatus === 'loading' ? <PageSkeleton className="mt-6" variant="list" /> : null}

        {journalStatus === 'ready' ? (
          <>
            <div className="mt-5">
              <ActivityJournalSummary
                activityCount={activities.length}
                totalDurationMinutes={totalDuration}
                totalCaloriesKcal={totalCalories}
              />
            </div>

            {activities.length === 0 ? (
              <EmptyState
                className="mt-4"
                icon={CalendarDays}
                title={`Aucune activité le ${formatLocalDate(date)}`}
                description="Démarre une activité ou ajoute une séance déjà réalisée."
                primaryAction={(
                  <Button onClick={() => setStartSheetOpen(true)}>
                    <Plus aria-hidden="true" className="size-4" />
                    Ajouter une activité
                  </Button>
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
          </>
        ) : null}
      </div>

      <Card className="mt-6 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-700 dark:text-brand-300" />
          <div>
            <h2 className="font-semibold text-slate-950 dark:text-white">Calories et activités</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Les calories sportives restent des estimations et peuvent être corrigées manuellement dans chaque activité.
            </p>
            <Link
              to={routePaths.calculationsInformation}
              className="mt-2 inline-flex min-h-10 items-center rounded-xl text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
            >
              Comprendre les calculs
            </Link>
          </div>
        </div>
      </Card>

      <SportStartSheet
        open={startSheetOpen}
        date={date}
        activityTypeOrder={snapshot?.activityTypeOrder ?? [...defaultActivityTypeOrder]}
        navigationState={navigationState}
        onClose={() => setStartSheetOpen(false)}
      />
    </section>
  );
}
