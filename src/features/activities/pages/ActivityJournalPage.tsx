import { ArrowLeft, CalendarDays, Plus } from 'lucide-react';
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
import { revealElement } from '@/shared/motion/revealElement';
import { useToast } from '@/shared/toast/useToast';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { RefreshStatus } from '@/shared/ui/RefreshStatus';
import { DateContextBanner } from '@/shared/ui/DateContextBanner';
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

interface ActivityHistoryViewProps {
  date: string;
  navigationState: ActivityJournalNavigationState;
  onChangeDate: (date: string) => void;
  onRecord: () => void;
  onHubRefresh: () => Promise<unknown>;
}

function ActivityHistoryView({
  date,
  navigationState,
  onChangeDate,
  onRecord,
  onHubRefresh,
}: ActivityHistoryViewProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const handledFeedbackRef = useRef<string | undefined>(undefined);
  const highlightTimerRef = useRef<number | undefined>(undefined);
  const locationState = location.state as ActivityJournalNavigationState | null;
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
  const currentJournalPath = `${location.pathname}${location.search}`;
  const totalDuration = activities.reduce((sum, activity) => sum + activity.durationMinutes, 0);
  const totalCalories = activities.reduce(
    (sum, activity) => sum + presentActivity(activity).caloriesKcal,
    0,
  );

  const highlightActivity = (activityId: string) => {
    if (highlightTimerRef.current !== undefined) window.clearTimeout(highlightTimerRef.current);
    setHighlightedActivityId(activityId);
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedActivityId(undefined);
      highlightTimerRef.current = undefined;
    }, 2_500);
  };

  useEffect(() => () => {
    if (highlightTimerRef.current !== undefined) window.clearTimeout(highlightTimerRef.current);
  }, []);

  useEffect(() => {
    if (!highlightedActivityId || status !== 'ready') return;
    window.requestAnimationFrame(() => {
      revealElement(document.getElementById(`activity-entry-${highlightedActivityId}`), {
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
    if (feedback.activityId) highlightActivity(feedback.activityId);
    void navigate(currentJournalPath, { replace: true, state: null });
    void onHubRefresh();
  }, [currentJournalPath, date, locationState, navigate, onHubRefresh, toast]);

  const handleDuplicate = async (activityId: string) => {
    const created = await duplicate(activityId);
    if (!created) return;
    toast.success('Activité dupliquée');
    highlightActivity(created.id);
    await onHubRefresh();
  };

  const handleRemove = async (activityId: string) => {
    const removed = await remove(activityId);
    if (removed) {
      toast.success('Activité supprimée');
      await onHubRefresh();
    }
    return removed;
  };

  return (
    <div className="mt-6">
      <DateContextBanner
        date={date}
        className="mb-4"
        onReturnToday={() => onChangeDate(toLocalDate())}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
            Activités du {formatLocalDate(date)}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Consulte, modifie ou duplique les activités de cette journée.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[12rem_auto] sm:items-end">
          <div>
            <label htmlFor="activity-journal-date" className="text-sm font-semibold">
              Journée consultée
            </label>
            <input
              id="activity-journal-date"
              type="date"
              value={date}
              onChange={(event) => onChangeDate(event.target.value)}
              className={`${inputClassName} mt-2`}
            />
          </div>
          <Button variant="secondary" size="lg" onClick={onRecord}>
            <Plus aria-hidden="true" className="size-5" />
            Ajouter
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <InlineNotice className="mt-5" tone="error" title="Opération impossible" role="alert">
          <p>{errorMessage}</p>
          {status === 'error' ? (
            <Button className="mt-3" variant="secondary" onClick={() => void refresh()}>Réessayer</Button>
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
              description="Enregistre une activité déjà réalisée pour la retrouver ici."
              primaryAction={<Button onClick={onRecord}>Ajouter une activité</Button>}
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
  );
}

export function ActivityJournalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const requestedDate = searchParams.get('date') ?? '';
  const hasExplicitDate = isValidLocalDate(requestedDate);
  const date = hasExplicitDate ? requestedDate : toLocalDate();
  const historyMode = searchParams.get('view') === 'history' || hasExplicitDate;
  const [startSheetOpen, setStartSheetOpen] = useState(false);
  const {
    status,
    snapshot,
    errorMessage,
    isRefreshing,
    refresh,
  } = useSportHub();
  const currentJournalPath = `${location.pathname}${location.search}`;
  const navigationState = useMemo(
    () => createActivityJournalReturnState(currentJournalPath, location.key, date),
    [currentJournalPath, date, location.key],
  );

  return (
    <section className="min-w-0" aria-labelledby="sport-hub-title">
      <div className="min-w-0">
        {historyMode ? (
          <Link
            to={routePaths.activities}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Retour au hub Sport
          </Link>
        ) : null}
        {historyMode ? (
          <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Historique complet
          </p>
        ) : null}
        <h1 id="sport-hub-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Sport
        </h1>
        {historyMode ? (
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
            Retrouve toutes les activités d’une journée et leurs détails.
          </p>
        ) : null}
      </div>

      {isRefreshing ? <RefreshStatus visible className="mt-4" label="Actualisation du hub Sport…" /> : null}

      {errorMessage ? (
        <InlineNotice className="mt-5" tone="error" title="Hub Sport partiellement indisponible" role="alert">
          <p>{errorMessage}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void refresh(status !== 'ready')}>
            Réessayer
          </Button>
        </InlineNotice>
      ) : null}

      {status === 'loading' && !snapshot ? <PageSkeleton className="mt-6" variant="dashboard" /> : null}

      {!historyMode && snapshot ? (
        <SportHubOverview
          snapshot={snapshot}
          navigationState={navigationState}
          onRecord={() => setStartSheetOpen(true)}
        />
      ) : null}

      {historyMode ? (
        <ActivityHistoryView
          date={date}
          navigationState={navigationState}
          onChangeDate={(nextDate) => setSearchParams({ view: 'history', date: nextDate })}
          onRecord={() => setStartSheetOpen(true)}
          onHubRefresh={() => refresh(false)}
        />
      ) : null}

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
