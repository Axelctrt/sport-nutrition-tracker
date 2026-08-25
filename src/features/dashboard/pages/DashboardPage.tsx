import {
  CircleAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useProfile } from '@/app/providers/profile/useProfile';
import { routePaths } from '@/app/routePaths';
import { DashboardDailyAssistant } from '@/features/dashboard/components/DashboardDailyAssistant';
import { DashboardDailyCoachCard } from '@/features/dashboard/components/DashboardDailyCoachCard';
import { DashboardFixedCore } from '@/features/dashboard/components/DashboardFixedCore';
import { DashboardRewardsOverview } from '@/features/dashboard/components/DashboardRewardsOverview';
import { DashboardTodaySummary } from '@/features/dashboard/components/DashboardTodaySummary';
import { DashboardWeeklyProgress } from '@/features/dashboard/components/DashboardWeeklyProgress';
import { GoalQuickEntryOverlay } from '@/features/dashboard/components/GoalQuickEntryOverlay';
import {
  dailyCompletionRevealWasSeen,
  markDailyCompletionRevealSeen,
  shouldCelebrateDailyCompletion,
} from '@/features/dashboard/dailyCompletionCelebration';
import { useDailyDashboard } from '@/features/dashboard/hooks/useDailyDashboard';
import type { CompleteDailyCheckOutInput } from '@/application/daily/dailyCoachingService';
import type { FoodJournalNavigationState } from '@/features/food-journal/navigation/foodJournalNavigation';
import type { WorkoutSessionNavigationState } from '@/features/strength-sessions/navigation/workoutSessionNavigation';
import { useCurrentWeight } from '@/features/weight/hooks/useCurrentWeight';
import { useDashboardPreferences } from '@/features/dashboard-customization/hooks/useDashboardPreferences';
import { useToast } from '@/shared/toast/useToast';
import { suppressNextActionToast, useActionToast } from '@/shared/toast/useActionToast';
import { Button } from '@/shared/ui/Button';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { SportPilotDailyCompletionReveal } from '@/shared/ui/SportPilotDailyCompletionReveal';
import { formatLocalDate } from '@/shared/utils/dates';

export function DashboardPage() {
  const { profile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const actionToast = useActionToast();
  const handledFoodFeedbackRef = useRef<string | undefined>(undefined);
  const handledWorkoutFeedbackRef = useRef<string | undefined>(undefined);
  const locationState = location.state as (
    FoodJournalNavigationState & WorkoutSessionNavigationState
  ) | null;
  const [highlightedStage, setHighlightedStage] = useState<'sport'>();
  const [dailyCompletionVisible, setDailyCompletionVisible] = useState(false);
  const {
    date,
    status,
    snapshot,
    nutrition,
    activeWorkout,
    activityPlanning,
    dailyCoaching,
    dailyCoach,
    dailyCoachError,
    errorMessage,
    refresh,
    saveWeight,
    saveSteps,
    saveCheckIn,
    saveActivityDecision,
    saveCheckOut,
    planStrengthActivity,
    updateStrengthActivity,
    startStrengthActivity,
    skipStrengthActivity,
    restoreStrengthActivity,
    saveEnduranceActivity,
    skipEnduranceActivity,
    restoreEnduranceActivity,
  } = useDailyDashboard();
  const {
    preferences,
    density,
    errorMessage: preferencesError,
  } = useDashboardPreferences();

  const currentWeightState = useCurrentWeight(profile);

  useEffect(() => {
    const feedback = locationState?.foodJournalFeedback;
    if (!feedback) return;
    const feedbackKey = `${feedback.title}:${feedback.entryId ?? feedback.mealSlot}`;
    if (handledFoodFeedbackRef.current === feedbackKey) return;
    handledFoodFeedbackRef.current = feedbackKey;
    toast.success(feedback.title);
    void refresh();
    void navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    });
  }, [location.pathname, location.search, locationState, navigate, refresh, toast]);

  useEffect(() => {
    const feedback = locationState?.workoutSessionFeedback;
    if (!feedback) return;
    if (handledWorkoutFeedbackRef.current === feedback.sessionId) return;
    handledWorkoutFeedbackRef.current = feedback.sessionId;
    actionToast.success({
      key: `workout-session-complete:${feedback.sessionId}`,
      title: feedback.title,
      description: feedback.description,
    });
    setHighlightedStage('sport');
    void refresh();
    void navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    });
    const timer = window.setTimeout(() => setHighlightedStage(undefined), 2_500);
    return () => window.clearTimeout(timer);
  }, [actionToast, location.pathname, location.search, locationState, navigate, refresh]);

  if (!profile) return null;
  const firstName = profile.firstName?.trim();

  const saveCheckOutWithCelebration = async (input: CompleteDailyCheckOutInput) => {
    const completedPlannedActivityCount = activityPlanning.strengthSessions
      .filter(({ session }) => session.status === 'completed')
      .length
      + activityPlanning.enduranceSessions
        .filter(({ completedActivity }) => Boolean(completedActivity))
        .length;
    const celebrate = Boolean(snapshot && nutrition && dailyCoaching)
      && shouldCelebrateDailyCompletion({
        checkInComplete: Boolean(dailyCoaching?.checkIn),
        sportPerformed: (snapshot?.activities.length ?? 0) > 0 || completedPlannedActivityCount > 0,
        nutritionComplete: input.foodJournalComplete || Boolean(nutrition?.journalStatus?.isComplete),
        checkOutAlreadyComplete: Boolean(dailyCoaching?.checkOut),
      })
      && !dailyCompletionRevealWasSeen(date);

    if (celebrate) suppressNextActionToast(`daily-check-out:${date}`);
    await saveCheckOut(input);
    if (celebrate) {
      markDailyCompletionRevealSeen(date);
      setDailyCompletionVisible(true);
    }
  };

  return (
    <>
      <section aria-labelledby="dashboard-title">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              {formatLocalDate(date, 'EEEE d MMMM')}
            </p>
            <h1
              id="dashboard-title"
              className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white"
            >
              {firstName
                ? `Bonjour ${firstName}`
                : 'Tableau de bord'}
            </h1>
          </div>

          <Link
            to={routePaths.dashboardCustomization}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <SlidersHorizontal
              aria-hidden="true"
              className="size-4"
            />
            <span className="hidden sm:inline">Affichage</span>
            <span className="sm:hidden">Vue</span>
          </Link>
        </div>

        {status === 'loading' && !snapshot ? (
          <PageSkeleton variant="dashboard" className="mt-6" />
        ) : null}

        {status === 'error' && !snapshot ? (
          <InlineNotice
            className="mt-6"
            tone="error"
            title="Tableau de bord indisponible"
            role="alert"
          >
            <p>{errorMessage}</p>
            <Button
              className="mt-3"
              variant="secondary"
              onClick={() => void refresh()}
            >
              Réessayer
            </Button>
          </InlineNotice>
        ) : null}

        {status === 'error' && snapshot ? (
          <InlineNotice
            className="mt-5"
            tone="error"
            title="Mise à jour impossible"
            role="alert"
          >
            <p>
              {errorMessage} Les dernières données disponibles restent
              affichées.
            </p>
            <Button
              className="mt-3"
              variant="secondary"
              onClick={() => void refresh()}
            >
              Réessayer
            </Button>
          </InlineNotice>
        ) : null}

        {preferencesError ? (
          <InlineNotice
            className="mt-4"
            tone="error"
            title="Affichage personnalisé indisponible"
          >
            {preferencesError} L’affichage recommandé est utilisé temporairement.
          </InlineNotice>
        ) : null}

        {snapshot && nutrition ? (
          <>
            <DashboardFixedCore
              summary={(
                <DashboardTodaySummary
                  snapshot={snapshot}
                  nutrition={nutrition}
                  dailyStepGoal={profile.dailyStepGoal}
                  visibleMetrics={preferences.summaryMetrics}
                  currentWeightKg={currentWeightState.currentWeight.weightKg}
                  {...(currentWeightState.currentWeight.source === 'entry'
                    ? { currentWeightMeasuredAt: currentWeightState.currentWeight.measuredAt }
                    : {})}
                  density={density}
                  isRefreshing={status === 'loading'}
                />
              )}
              coach={dailyCoaching?.checkIn && (dailyCoach || dailyCoachError) ? (
                <DashboardDailyCoachCard
                  {...(dailyCoach ? { result: dailyCoach } : {})}
                  unavailable={Boolean(dailyCoachError)}
                />
              ) : null}
              assistant={dailyCoaching ? (
                  <DashboardDailyAssistant
                    date={date}
                    snapshot={snapshot}
                    nutrition={nutrition}
                    dailyCoaching={dailyCoaching}
                    activityPlanning={activityPlanning}
                    {...(highlightedStage ? { highlightedStage } : {})}
                    {...(activeWorkout ? { activeWorkout } : {})}
                    onSaveCheckIn={saveCheckIn}
                    onSaveActivityDecision={saveActivityDecision}
                    onSaveCheckOut={saveCheckOutWithCelebration}
                    onPlanStrength={planStrengthActivity}
                    onUpdateStrength={updateStrengthActivity}
                    onStartStrength={startStrengthActivity}
                    onSkipStrength={skipStrengthActivity}
                    onRestoreStrength={restoreStrengthActivity}
                    onSaveEndurance={saveEnduranceActivity}
                    onSkipEndurance={skipEnduranceActivity}
                    onRestoreEndurance={restoreEnduranceActivity}
                  />
              ) : null}
            />

            {preferences.supplementalBlock === 'weeklyProgress' ? (
              <DashboardWeeklyProgress profile={profile} />
            ) : null}

            {preferences.supplementalBlock === 'achievements' ? (
              <DashboardRewardsOverview className="mt-5" compact />
            ) : null}
          </>
        ) : status !== 'loading' && status !== 'error' ? (
          <InlineNotice
            className="mt-6"
            tone="error"
            title="Données quotidiennes absentes"
          >
            <div className="flex items-center gap-2">
              <CircleAlert
                aria-hidden="true"
                className="size-4"
              />
              Recharge la page pour relancer le calcul.
            </div>
          </InlineNotice>
        ) : null}
      </section>

      {snapshot ? (
        <GoalQuickEntryOverlay
          date={date}
          snapshot={snapshot}
          onSaveWeight={saveWeight}
          onSaveSteps={saveSteps}
        />
      ) : null}

      {dailyCompletionVisible ? (
        <SportPilotDailyCompletionReveal
          onContinue={() => setDailyCompletionVisible(false)}
        />
      ) : null}
    </>
  );
}
