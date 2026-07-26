import { useCallback, useEffect, useState } from 'react';
import {
  calculateAndPersistDailyTarget,
  type DailyTargetSnapshot,
} from '@/application/daily/dailyTargetCoordinator';
import {
  completeDailyCheckIn,
  completeDailyCheckOut,
  readDailyCoachingDay,
  setDailyActivityDecision,
  type CompleteDailyCheckInInput,
  type CompleteDailyCheckOutInput,
  type DailyCoachingDay,
  type SetDailyActivityDecisionInput,
} from '@/application/daily/dailyCoachingService';
import { recalculateTargetsAfterWeightChange } from '@/application/daily/referenceWeightRecalculationService';
import { useProfile } from '@/app/providers/profile/useProfile';
import {
  calculateDailyNutrition,
  calculateRemainingNutrition,
  type DailyNutritionSummary,
  type RemainingNutrition,
} from '@/domain/calculations/nutrition';
import type { NewEntity } from '@/domain/models/common';
import type { DailyJournalStatus } from '@/domain/models/food';
import type { UserProfile } from '@/domain/models/profile';
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

export interface DailyDashboardDependencies {
  calculateTarget: typeof calculateAndPersistDailyTarget;
  recalculateTargetsAfterWeightChange: typeof recalculateTargetsAfterWeightChange;
  dailyCoaching: {
    read: typeof readDailyCoachingDay;
    completeCheckIn: typeof completeDailyCheckIn;
    setActivityDecision: typeof setDailyActivityDecision;
    completeCheckOut: typeof completeDailyCheckOut;
  };
  repositories: {
    weight: Pick<typeof repositories.weight, 'upsert'>;
    food: Pick<
      typeof repositories.food,
      'listEntriesByDate' | 'getJournalStatus'
    >;
    workoutSessions: Pick<
      typeof repositories.workoutSessions,
      'getInProgress' | 'listExercises'
    >;
    steps: Pick<typeof repositories.steps, 'upsert'>;
  };
}

export interface UseDailyDashboardOptions {
  profileOverride?: UserProfile;
  dependencies?: DailyDashboardDependencies;
}

const defaultDependencies: DailyDashboardDependencies = {
  calculateTarget: calculateAndPersistDailyTarget,
  recalculateTargetsAfterWeightChange,
  dailyCoaching: {
    read: readDailyCoachingDay,
    completeCheckIn: completeDailyCheckIn,
    setActivityDecision: setDailyActivityDecision,
    completeCheckOut: completeDailyCheckOut,
  },
  repositories,
};

export function useDailyDashboard(options: UseDailyDashboardOptions = {}) {
  const { profile: contextProfile } = useProfile();
  const profile = options.profileOverride ?? contextProfile;
  const dependencies = options.dependencies ?? defaultDependencies;
  const [status, setStatus] = useState<DailyDashboardStatus>('loading');
  const [snapshot, setSnapshot] = useState<DailyTargetSnapshot>();
  const [nutrition, setNutrition] = useState<DailyDashboardNutrition>();
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutSummary>();
  const [dailyCoaching, setDailyCoaching] = useState<DailyCoachingDay>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const date = toLocalDate();

  const refresh = useCallback(async () => {
    if (!profile) {
      return;
    }

    setStatus('loading');
    setErrorMessage(undefined);

    try {
      const [
        nextSnapshot,
        entries,
        journalStatus,
        inProgressSession,
        nextDailyCoaching,
      ] = await Promise.all([
        dependencies.calculateTarget(date, profile),
        dependencies.repositories.food.listEntriesByDate(date),
        dependencies.repositories.food.getJournalStatus(date),
        dependencies.repositories.workoutSessions.getInProgress(),
        dependencies.dailyCoaching.read(date),
      ]);
      const inProgressExercises = inProgressSession
        ? await dependencies.repositories.workoutSessions.listExercises(inProgressSession.id)
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
      setDailyCoaching(nextDailyCoaching);
      setStatus('ready');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Le tableau de bord quotidien ne peut pas être calculé.',
      );
      setStatus('error');
    }
  }, [date, dependencies, profile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveWeight = useCallback(async (data: NewEntity<WeightEntry>) => {
    await dependencies.repositories.weight.upsert(data);
    if (profile) {
      await dependencies.recalculateTargetsAfterWeightChange(data.date, profile);
    }
    await refresh();
  }, [dependencies, profile, refresh]);

  const saveSteps = useCallback(async (data: NewEntity<DailySteps>) => {
    await dependencies.repositories.steps.upsert(data);
    await refresh();
  }, [dependencies, refresh]);

  const saveCheckIn = useCallback(async (input: CompleteDailyCheckInInput) => {
    await dependencies.dailyCoaching.completeCheckIn(input);
    if (profile && typeof input.weightKg === 'number') {
      await dependencies.recalculateTargetsAfterWeightChange(input.date, profile);
    }
    await refresh();
  }, [dependencies, profile, refresh]);

  const saveActivityDecision = useCallback(
    async (input: SetDailyActivityDecisionInput) => {
      await dependencies.dailyCoaching.setActivityDecision(input);
      await refresh();
    },
    [dependencies, refresh],
  );

  const saveCheckOut = useCallback(async (input: CompleteDailyCheckOutInput) => {
    await dependencies.dailyCoaching.completeCheckOut(input);
    await refresh();
  }, [dependencies, refresh]);

  return {
    date,
    status,
    snapshot,
    nutrition,
    activeWorkout,
    dailyCoaching,
    errorMessage,
    refresh,
    saveWeight,
    saveSteps,
    saveCheckIn,
    saveActivityDecision,
    saveCheckOut,
  };
}
