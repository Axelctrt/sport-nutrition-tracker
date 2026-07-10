import { useCallback, useEffect, useState } from 'react';
import type { EntityId, LocalDate } from '@/domain/models/common';
import type { StrengthSessionStyle } from '@/domain/models/strength';
import type { PlannedActivityCalorieSnapshot } from '@/domain/models/plannedActivity';
import type { WorkoutTemplateSummary } from '@/application/strength/workoutTemplateService';
import { listWorkoutTemplates } from '@/application/strength/workoutTemplateService';
import {
  getWeekStart,
  listWeeklyPlanning,
  planWorkoutSessionFromTemplate,
  planningDateForSession,
  reschedulePlannedWorkoutSession,
  shiftWeek,
  skipPlannedWorkoutSession,
  startPlannedWorkoutSession,
  type WeeklyPlanningDay,
} from '@/application/strength/weeklyPlanningService';
import { repositories } from '@/infrastructure/repositories/repositories';
import { recalculatePlannedActivityTargetsForCurrentProfile } from '@/application/planning/plannedActivityTargetService';
import { toLocalDate } from '@/shared/utils/dates';

export function useWeeklyPlanning() {
  const [weekStart, setWeekStart] = useState<LocalDate>(() => getWeekStart());
  const [days, setDays] = useState<WeeklyPlanningDay[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplateSummary[]>([]);
  const [calorieProjections, setCalorieProjections] = useState<
    Record<string, PlannedActivityCalorieSnapshot>
  >({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionId, setActionId] = useState<EntityId | 'create'>();

  const refresh = useCallback(async (showLoading = true) => {
    if (showLoading) setStatus('loading');
    else setIsRefreshing(true);
    setErrorMessage(undefined);
    try {
      const [nextDays, nextTemplates] = await Promise.all([
        listWeeklyPlanning(repositories.workoutSessions, weekStart),
        listWorkoutTemplates(repositories.workoutTemplates, false),
      ]);
      let nextCalorieProjections: Record<string, PlannedActivityCalorieSnapshot> = {};
      const firstDate = nextDays.at(0)?.date;
      const lastDate = nextDays.at(-1)?.date;

      if (firstDate && lastDate) {
        try {
          const targets = await repositories.targets.listTargetsBetween(
            firstDate,
            lastDate,
          );
          nextCalorieProjections = Object.fromEntries(
            targets.flatMap((target) => (target.plannedActivities ?? []))
              .filter((projection) => projection.source === 'strengthSession')
              .map((projection) => [projection.sourceId, projection]),
          );
        } catch {
          // L’estimation affichée est secondaire : le planning reste utilisable.
        }
      }

      setDays(nextDays);
      setTemplates(nextTemplates);
      setCalorieProjections(nextCalorieProjections);
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger le planning.');
      if (showLoading) setStatus('error');
    } finally {
      setIsRefreshing(false);
    }
  }, [weekStart]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const findSession = useCallback(
    (sessionId: EntityId) => days
      .flatMap((day) => day.sessions)
      .find(({ session }) => session.id === sessionId)
      ?.session,
    [days],
  );

  const recalculateDates = useCallback(async (dates: LocalDate[]) => {
    await recalculatePlannedActivityTargetsForCurrentProfile(dates);
  }, []);

  const changeWeek = useCallback((amount: number) => {
    setWeekStart((current) => shiftWeek(current, amount));
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setWeekStart(getWeekStart(toLocalDate()));
  }, []);

  const goToDate = useCallback((date: LocalDate) => {
    setWeekStart(getWeekStart(date));
  }, []);

  const plan = useCallback(async (
    templateId: EntityId,
    scheduledDate: LocalDate,
    plannedDurationMinutes: number,
    strengthSessionStyle: StrengthSessionStyle,
  ) => {
    setActionId('create');
    setErrorMessage(undefined);
    try {
      const created = await planWorkoutSessionFromTemplate(
        repositories.workoutSessions,
        repositories.workoutTemplates,
        repositories.strengthExercises,
        templateId,
        scheduledDate,
        { plannedDurationMinutes, strengthSessionStyle },
      );
      await recalculateDates([scheduledDate]);
      await refresh(false);
      return created.session;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de planifier la séance.');
      return undefined;
    } finally {
      setActionId(undefined);
    }
  }, [recalculateDates, refresh]);

  const start = useCallback(async (sessionId: EntityId) => {
    setActionId(sessionId);
    setErrorMessage(undefined);
    try {
      const previous = findSession(sessionId);
      const session = await startPlannedWorkoutSession(repositories.workoutSessions, sessionId);
      await recalculateDates([
        ...(previous ? [planningDateForSession(previous)] : []),
        session.date,
      ]);
      await refresh(false);
      return session;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de démarrer la séance prévue.');
      return undefined;
    } finally {
      setActionId(undefined);
    }
  }, [findSession, recalculateDates, refresh]);

  const reschedule = useCallback(async (sessionId: EntityId, scheduledDate: LocalDate) => {
    setActionId(sessionId);
    setErrorMessage(undefined);
    try {
      const previous = findSession(sessionId);
      await reschedulePlannedWorkoutSession(repositories.workoutSessions, sessionId, scheduledDate);
      await recalculateDates([
        ...(previous ? [planningDateForSession(previous)] : []),
        scheduledDate,
      ]);
      await refresh(false);
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de reporter la séance.');
      return false;
    } finally {
      setActionId(undefined);
    }
  }, [findSession, recalculateDates, refresh]);

  const skip = useCallback(async (sessionId: EntityId) => {
    setActionId(sessionId);
    setErrorMessage(undefined);
    try {
      const previous = findSession(sessionId);
      await skipPlannedWorkoutSession(repositories.workoutSessions, sessionId);
      if (previous) {
        await recalculateDates([planningDateForSession(previous)]);
      }
      await refresh(false);
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de modifier la séance prévue.');
      return false;
    } finally {
      setActionId(undefined);
    }
  }, [findSession, recalculateDates, refresh]);

  return {
    weekStart,
    days,
    templates,
    calorieProjections,
    status,
    errorMessage,
    isRefreshing,
    actionId,
    refresh,
    changeWeek,
    goToCurrentWeek,
    goToDate,
    plan,
    start,
    reschedule,
    skip,
  };
}
