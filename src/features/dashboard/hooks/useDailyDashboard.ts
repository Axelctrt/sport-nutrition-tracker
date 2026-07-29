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
import {
  loadDailyActivityPlanning,
  planDailyStrengthActivity,
  restoreDailyEnduranceActivity,
  restoreDailyStrengthActivity,
  saveDailyEnduranceActivity,
  skipDailyEnduranceActivity,
  skipDailyStrengthActivity,
  startDailyStrengthActivity,
  updateDailyStrengthActivity,
  type DailyActivityPlanningSnapshot,
  type PlanDailyStrengthInput,
  type UpdateDailyStrengthInput,
} from '@/application/planning/dailyActivityPlanningService';
import type { PlannedEnduranceInput } from '@/application/planning/endurancePlanningService';
import { useProfile } from '@/app/providers/profile/useProfile';
import {
  calculateDailyNutrition,
  calculateRemainingNutrition,
  type DailyNutritionSummary,
  type RemainingNutrition,
} from '@/domain/calculations/nutrition';
import type { NewEntity } from '@/domain/models/common';
import type { DailyJournalStatus, MealSlot } from '@/domain/models/food';
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
  entryCounts: Readonly<Record<MealSlot, number>>;
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
  planning?: {
    load: typeof loadDailyActivityPlanning;
    planStrength: typeof planDailyStrengthActivity;
    updateStrength: typeof updateDailyStrengthActivity;
    startStrength: typeof startDailyStrengthActivity;
    skipStrength: typeof skipDailyStrengthActivity;
    restoreStrength?: typeof restoreDailyStrengthActivity;
    saveEndurance: typeof saveDailyEnduranceActivity;
    skipEndurance: typeof skipDailyEnduranceActivity;
    restoreEndurance?: typeof restoreDailyEnduranceActivity;
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
  planning: {
    load: loadDailyActivityPlanning,
    planStrength: planDailyStrengthActivity,
    updateStrength: updateDailyStrengthActivity,
    startStrength: startDailyStrengthActivity,
    skipStrength: skipDailyStrengthActivity,
    restoreStrength: restoreDailyStrengthActivity,
    saveEndurance: saveDailyEnduranceActivity,
    skipEndurance: skipDailyEnduranceActivity,
    restoreEndurance: restoreDailyEnduranceActivity,
  },
};

export function useDailyDashboard(options: UseDailyDashboardOptions = {}) {
  const { profile: contextProfile } = useProfile();
  const profile = options.profileOverride ?? contextProfile;
  const dependencies = options.dependencies ?? defaultDependencies;
  const [status, setStatus] = useState<DailyDashboardStatus>('loading');
  const [snapshot, setSnapshot] = useState<DailyTargetSnapshot>();
  const [nutrition, setNutrition] = useState<DailyDashboardNutrition>();
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutSummary>();
  const [activityPlanning, setActivityPlanning] = useState<DailyActivityPlanningSnapshot>({
    strengthSessions: [],
    enduranceSessions: [],
    templates: [],
  });
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
        nextActivityPlanning,
      ] = await Promise.all([
        dependencies.calculateTarget(date, profile),
        dependencies.repositories.food.listEntriesByDate(date),
        dependencies.repositories.food.getJournalStatus(date),
        dependencies.repositories.workoutSessions.getInProgress(),
        dependencies.dailyCoaching.read(date),
        dependencies.planning?.load(date) ?? Promise.resolve({
          strengthSessions: [],
          enduranceSessions: [],
          templates: [],
        }),
      ]);
      const inProgressExercises = inProgressSession
        ? await dependencies.repositories.workoutSessions.listExercises(inProgressSession.id)
        : [];
      const consumed = calculateDailyNutrition(entries);
      const entryCounts = entries.reduce<Record<MealSlot, number>>(
        (counts, entry) => ({
          ...counts,
          [entry.mealSlot]: counts[entry.mealSlot] + 1,
        }),
        {
          breakfast: 0,
          lunch: 0,
          dinner: 0,
          snacks: 0,
        },
      );
      setSnapshot(nextSnapshot);
      setNutrition({
        consumed,
        remaining: calculateRemainingNutrition(
          nextSnapshot.target.targetCaloriesKcal,
          nextSnapshot.target.macros,
          consumed,
        ),
        journalStatus,
        entryCounts,
      });
      setActiveWorkout(inProgressSession
        ? { session: inProgressSession, exerciseCount: inProgressExercises.length }
        : undefined);
      setDailyCoaching(nextDailyCoaching);
      setActivityPlanning(nextActivityPlanning);
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

  const clearRestDecision = useCallback(async () => {
    if (dailyCoaching?.activityDecision?.decision === 'rest') {
      await dependencies.dailyCoaching.setActivityDecision({
        date,
        decision: 'open',
      });
    }
  }, [dailyCoaching?.activityDecision?.decision, date, dependencies.dailyCoaching]);

  const planStrengthActivity = useCallback(async (input: PlanDailyStrengthInput) => {
    if (!dependencies.planning) return undefined;
    const session = await dependencies.planning.planStrength(input);
    await clearRestDecision();
    await refresh();
    return session;
  }, [clearRestDecision, dependencies.planning, refresh]);

  const updateStrengthActivity = useCallback(async (input: UpdateDailyStrengthInput) => {
    if (!dependencies.planning) return undefined;
    const session = await dependencies.planning.updateStrength(input);
    await refresh();
    return session;
  }, [dependencies.planning, refresh]);

  const startStrengthActivity = useCallback(async (sessionId: string) => {
    if (!dependencies.planning) return undefined;
    const session = await dependencies.planning.startStrength(sessionId);
    await refresh();
    return session;
  }, [dependencies.planning, refresh]);

  const skipStrengthActivity = useCallback(async (sessionId: string) => {
    if (!dependencies.planning) return;
    await dependencies.planning.skipStrength(sessionId);
    await refresh();
  }, [dependencies.planning, refresh]);

  const restoreStrengthActivity = useCallback(async (sessionId: string) => {
    if (!dependencies.planning?.restoreStrength) return;
    await dependencies.planning.restoreStrength(sessionId);
    await refresh();
  }, [dependencies.planning, refresh]);

  const saveEnduranceActivity = useCallback(async (
    input: PlannedEnduranceInput,
    sessionId?: string,
  ) => {
    if (!dependencies.planning) return undefined;
    const session = await dependencies.planning.saveEndurance(input, sessionId);
    await clearRestDecision();
    await refresh();
    return session;
  }, [clearRestDecision, dependencies.planning, refresh]);

  const skipEnduranceActivity = useCallback(async (sessionId: string) => {
    if (!dependencies.planning) return;
    await dependencies.planning.skipEndurance(sessionId);
    await refresh();
  }, [dependencies.planning, refresh]);

  const restoreEnduranceActivity = useCallback(async (sessionId: string) => {
    if (!dependencies.planning?.restoreEndurance) return;
    await dependencies.planning.restoreEndurance(sessionId);
    await refresh();
  }, [dependencies.planning, refresh]);

  return {
    date,
    status,
    snapshot,
    nutrition,
    activeWorkout,
    activityPlanning,
    dailyCoaching,
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
  };
}
