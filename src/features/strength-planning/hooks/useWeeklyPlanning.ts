import { useCallback, useEffect, useState } from 'react';
import type { EntityId, LocalDate } from '@/domain/models/common';
import type { WorkoutTemplateSummary } from '@/application/strength/workoutTemplateService';
import { listWorkoutTemplates } from '@/application/strength/workoutTemplateService';
import {
  getWeekStart,
  listWeeklyPlanning,
  planWorkoutSessionFromTemplate,
  reschedulePlannedWorkoutSession,
  shiftWeek,
  skipPlannedWorkoutSession,
  startPlannedWorkoutSession,
  type WeeklyPlanningDay,
} from '@/application/strength/weeklyPlanningService';
import { repositories } from '@/infrastructure/repositories/repositories';
import { toLocalDate } from '@/shared/utils/dates';

export function useWeeklyPlanning() {
  const [weekStart, setWeekStart] = useState<LocalDate>(() => getWeekStart());
  const [days, setDays] = useState<WeeklyPlanningDay[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplateSummary[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [actionId, setActionId] = useState<EntityId | 'create'>();

  const refresh = useCallback(async (showLoading = true) => {
    if (showLoading) setStatus('loading');
    setErrorMessage(undefined);
    try {
      const [nextDays, nextTemplates] = await Promise.all([
        listWeeklyPlanning(repositories.workoutSessions, weekStart),
        listWorkoutTemplates(repositories.workoutTemplates, false),
      ]);
      setDays(nextDays);
      setTemplates(nextTemplates);
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger le planning.');
      setStatus('error');
    }
  }, [weekStart]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const changeWeek = useCallback((amount: number) => {
    setWeekStart((current) => shiftWeek(current, amount));
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setWeekStart(getWeekStart(toLocalDate()));
  }, []);

  const goToDate = useCallback((date: LocalDate) => {
    setWeekStart(getWeekStart(date));
  }, []);

  const plan = useCallback(async (templateId: EntityId, scheduledDate: LocalDate) => {
    setActionId('create');
    setErrorMessage(undefined);
    try {
      const created = await planWorkoutSessionFromTemplate(
        repositories.workoutSessions,
        repositories.workoutTemplates,
        repositories.strengthExercises,
        templateId,
        scheduledDate,
      );
      await refresh(false);
      return created.session;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de planifier la séance.');
      return undefined;
    } finally {
      setActionId(undefined);
    }
  }, [refresh]);

  const start = useCallback(async (sessionId: EntityId) => {
    setActionId(sessionId);
    setErrorMessage(undefined);
    try {
      const session = await startPlannedWorkoutSession(repositories.workoutSessions, sessionId);
      await refresh(false);
      return session;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de démarrer la séance prévue.');
      return undefined;
    } finally {
      setActionId(undefined);
    }
  }, [refresh]);

  const reschedule = useCallback(async (sessionId: EntityId, scheduledDate: LocalDate) => {
    setActionId(sessionId);
    setErrorMessage(undefined);
    try {
      await reschedulePlannedWorkoutSession(repositories.workoutSessions, sessionId, scheduledDate);
      await refresh(false);
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de reporter la séance.');
      return false;
    } finally {
      setActionId(undefined);
    }
  }, [refresh]);

  const skip = useCallback(async (sessionId: EntityId) => {
    setActionId(sessionId);
    setErrorMessage(undefined);
    try {
      await skipPlannedWorkoutSession(repositories.workoutSessions, sessionId);
      await refresh(false);
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de modifier la séance prévue.');
      return false;
    } finally {
      setActionId(undefined);
    }
  }, [refresh]);

  return {
    weekStart,
    days,
    templates,
    status,
    errorMessage,
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
