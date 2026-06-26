import { useCallback, useEffect, useState } from 'react';
import {
  calculateAndPersistDailyTarget,
  type DailyTargetSnapshot,
} from '@/application/daily/dailyTargetCoordinator';
import { useProfile } from '@/app/providers/profile/useProfile';
import {
  calculateDailyNutrition,
  calculateRemainingNutrition,
  type DailyNutritionSummary,
  type RemainingNutrition,
} from '@/domain/calculations/nutrition';
import type { NewEntity } from '@/domain/models/common';
import type { DailyJournalStatus } from '@/domain/models/food';
import type { WorkoutSession } from '@/domain/models/strength';
import type { DailySteps } from '@/domain/models/steps';
import type { WeightEntry } from '@/domain/models/weight';
import { repositories } from '@/infrastructure/repositories/repositories';
import { toLocalDate } from '@/shared/utils/dates';

export type DailyDashboardStatus = 'loading' | 'ready' | 'error';

export interface DailyDashboardNutrition {
  consumed: DailyNutritionSummary;
  remaining: RemainingNutrition;
  journalStatus: DailyJournalStatus | undefined;
}

export interface ActiveWorkoutSummary {
  session: WorkoutSession;
  exerciseCount: number;
}

export function useDailyDashboard() {
  const { profile } = useProfile();
  const [status, setStatus] = useState<DailyDashboardStatus>('loading');
  const [snapshot, setSnapshot] = useState<DailyTargetSnapshot>();
  const [nutrition, setNutrition] = useState<DailyDashboardNutrition>();
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutSummary>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const date = toLocalDate();

  const refresh = useCallback(async () => {
    if (!profile) {
      return;
    }

    setStatus('loading');
    setErrorMessage(undefined);

    try {
      const [nextSnapshot, entries, journalStatus, inProgressSession] = await Promise.all([
        calculateAndPersistDailyTarget(date, profile),
        repositories.food.listEntriesByDate(date),
        repositories.food.getJournalStatus(date),
        repositories.workoutSessions.getInProgress(),
      ]);
      const inProgressExercises = inProgressSession
        ? await repositories.workoutSessions.listExercises(inProgressSession.id)
        : [];
      const consumed = calculateDailyNutrition(entries);
      setSnapshot(nextSnapshot);
      setNutrition({
        consumed,
        remaining: calculateRemainingNutrition(
          nextSnapshot.target.targetCaloriesKcal,
          nextSnapshot.target.macros,
          consumed,
        ),
        journalStatus,
      });
      setActiveWorkout(inProgressSession
        ? { session: inProgressSession, exerciseCount: inProgressExercises.length }
        : undefined);
      setStatus('ready');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Le tableau de bord quotidien ne peut pas être calculé.',
      );
      setStatus('error');
    }
  }, [date, profile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveWeight = useCallback(async (data: NewEntity<WeightEntry>) => {
    await repositories.weight.upsert(data);
    await refresh();
  }, [refresh]);

  const saveSteps = useCallback(async (data: NewEntity<DailySteps>) => {
    await repositories.steps.upsert(data);
    await refresh();
  }, [refresh]);

  return {
    date,
    status,
    snapshot,
    nutrition,
    activeWorkout,
    errorMessage,
    refresh,
    saveWeight,
    saveSteps,
  };
}
