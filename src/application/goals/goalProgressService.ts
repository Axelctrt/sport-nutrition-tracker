import type { BackupData } from '@/domain/models/backup';
import {
  GOAL_MILESTONES,
  getGoalMetricDefinition,
  readGoalState,
  writeGoalState,
  type Goal,
  type GoalMetric,
  type GoalMilestone,
  type GoalState,
  type GoalStatus,
  flushGoalStatePersistence,
} from '@/domain/goals/goalState';
import { readBackupData } from '@/infrastructure/backup/backupService';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { appDatabase } from '@/infrastructure/database/database';
import {
  createDeletedDeletionRecord,
  deletionRecordId,
} from '@/domain/models/deletion';
import { reloadUserStateRuntime } from '@/infrastructure/user-state/userStateRuntime';

export interface GoalInput {
  title: string;
  metric: GoalMetric;
  targetValue: number;
  startDate: string;
  deadline?: string;
  baselineValue?: number;
}

export interface GoalProgressView {
  goal: Goal;
  currentValue: number;
  progressPercent: number;
  remainingValue: number;
  daysRemaining?: number;
  requiredPerDay?: number;
  isOverdue: boolean;
  newlyReachedMilestones: GoalMilestone[];
}

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function localToday(): string {
  const now = new Date();
  const local = new Date(
    now.getTime() - now.getTimezoneOffset() * 60_000,
  );
  return local.toISOString().slice(0, 10);
}

function dateIsIncluded(
  date: string,
  startDate: string,
): boolean {
  return date >= startDate;
}

function daysBetween(
  from: string,
  to: string,
): number {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return Math.ceil(
    (end.getTime() - start.getTime()) / 86_400_000,
  );
}

export function computeGoalCurrentValue(
  goal: Goal,
  data: BackupData,
): number {
  switch (goal.metric) {
    case 'weightTarget': {
      const latest = data.weights
        .filter(({ date }) =>
          dateIsIncluded(date, goal.startDate),
        )
        .sort((left, right) =>
          right.date.localeCompare(left.date),
        )[0];

      return latest?.weightKg ?? goal.baselineValue ?? 0;
    }

    case 'totalSteps':
      return data.dailySteps
        .filter(({ date }) =>
          dateIsIncluded(date, goal.startDate),
        )
        .reduce(
          (total, entry) => total + entry.totalSteps,
          0,
        );

    case 'activityMinutes':
      return data.activities
        .filter(({ date }) =>
          dateIsIncluded(date, goal.startDate),
        )
        .reduce(
          (total, activity) =>
            total + activity.durationMinutes,
          0,
        );

    case 'runningDistanceKm':
      return round(
        data.activities.reduce((total, activity) => {
          if (
            activity.type !== 'running' ||
            !dateIsIncluded(
              activity.date,
              goal.startDate,
            )
          ) {
            return total;
          }

          return total + activity.distanceKm;
        }, 0),
      );

    case 'swimmingDistanceKm':
      return round(
        data.activities.reduce((total, activity) => {
          if (
            activity.type !== 'swimming' ||
            !dateIsIncluded(
              activity.date,
              goal.startDate,
            )
          ) {
            return total;
          }

          return total + activity.distanceMeters / 1_000;
        }, 0),
      );

    case 'cyclingDistanceKm':
      return round(
        data.activities.reduce((total, activity) => {
          if (
            activity.type !== 'cycling' ||
            !dateIsIncluded(
              activity.date,
              goal.startDate,
            )
          ) {
            return total;
          }

          return total + (activity.distanceKm ?? 0);
        }, 0),
      );

    case 'strengthSessions':
      return data.workoutSessions.filter(
        (session) =>
          session.status === 'completed' &&
          dateIsIncluded(session.date, goal.startDate),
      ).length;

    case 'weighIns':
      return data.weights.filter(({ date }) =>
        dateIsIncluded(date, goal.startDate),
      ).length;
  }
}

export function computeGoalProgressPercent(
  goal: Goal,
  currentValue: number,
): number {
  if (goal.metric !== 'weightTarget') {
    return Math.min(
      100,
      Math.max(0, (currentValue / goal.targetValue) * 100),
    );
  }

  const baseline = goal.baselineValue;

  if (
    baseline === undefined ||
    baseline === goal.targetValue
  ) {
    return currentValue === goal.targetValue ? 100 : 0;
  }

  const totalChange = goal.targetValue - baseline;
  const achievedChange = currentValue - baseline;

  return Math.min(
    100,
    Math.max(0, (achievedChange / totalChange) * 100),
  );
}

function computeRemainingValue(
  goal: Goal,
  currentValue: number,
): number {
  if (goal.metric === 'weightTarget') {
    return round(
      Math.max(
        0,
        Math.abs(goal.targetValue - currentValue),
      ),
    );
  }

  return round(
    Math.max(0, goal.targetValue - currentValue),
  );
}

export function createGoalProgressView(
  goal: Goal,
  data: BackupData,
  today = localToday(),
): GoalProgressView {
  const currentValue = computeGoalCurrentValue(goal, data);
  const progressPercent = round(
    computeGoalProgressPercent(goal, currentValue),
    1,
  );
  const reachedSet = new Set(goal.reachedMilestones);
  const newlyReachedMilestones =
    GOAL_MILESTONES.filter(
      (milestone) =>
        progressPercent >= milestone &&
        !reachedSet.has(milestone),
    );
  const remainingValue = computeRemainingValue(
    goal,
    currentValue,
  );
  const daysRemaining = goal.deadline
    ? Math.max(0, daysBetween(today, goal.deadline))
    : undefined;
  const isOverdue =
    goal.deadline !== undefined &&
    goal.deadline < today &&
    progressPercent < 100;
  const requiredPerDay =
    daysRemaining && daysRemaining > 0
      ? round(remainingValue / daysRemaining)
      : undefined;

  return {
    goal,
    currentValue,
    progressPercent,
    remainingValue,
    ...(daysRemaining !== undefined
      ? { daysRemaining }
      : {}),
    ...(requiredPerDay !== undefined
      ? { requiredPerDay }
      : {}),
    isOverdue,
    newlyReachedMilestones,
  };
}

function persistGoals(goals: Goal[]): GoalState {
  const state: GoalState = {
    version: 1,
    goals,
  };
  writeGoalState(state);
  return state;
}

export async function refreshGoalProgress(
  database: AppDatabase = appDatabase,
): Promise<GoalProgressView[]> {
  const state = readGoalState();
  const data = await readBackupData(database);
  const now = new Date().toISOString();
  let changed = false;

  const views = state.goals.map((goal) => {
    const initialView = createGoalProgressView(goal, data);
    const milestones = [
      ...new Set([
        ...goal.reachedMilestones,
        ...initialView.newlyReachedMilestones,
      ]),
    ].sort((left, right) => left - right);

    const shouldComplete =
      goal.status === 'active' &&
      initialView.progressPercent >= 100;

    if (
      milestones.length !== goal.reachedMilestones.length ||
      shouldComplete
    ) {
      changed = true;
      const updatedGoal: Goal = {
        ...goal,
        reachedMilestones: milestones,
        status: shouldComplete
          ? 'completed'
          : goal.status,
        updatedAt: now,
        ...(shouldComplete
          ? { completedAt: goal.completedAt ?? now }
          : {}),
      };

      return createGoalProgressView(updatedGoal, data);
    }

    return initialView;
  });

  if (changed) {
    persistGoals(views.map(({ goal }) => goal));
  }

  return views.sort((left, right) => {
    const statusOrder: Record<GoalStatus, number> = {
      active: 0,
      paused: 1,
      completed: 2,
      archived: 3,
    };

    const statusDifference =
      statusOrder[left.goal.status] -
      statusOrder[right.goal.status];

    if (statusDifference !== 0) return statusDifference;

    return (
      left.goal.deadline ?? '9999-12-31'
    ).localeCompare(
      right.goal.deadline ?? '9999-12-31',
    );
  });
}

export function saveGoal(
  input: GoalInput,
  goalId?: string,
): Goal {
  const state = readGoalState();
  const now = new Date().toISOString();
  const metricDefinition = getGoalMetricDefinition(
    input.metric,
  );

  if (
    !Number.isFinite(input.targetValue) ||
    input.targetValue <= 0
  ) {
    throw new Error(
      'La cible doit être un nombre strictement positif.',
    );
  }

  if (
    input.deadline &&
    input.deadline < input.startDate
  ) {
    throw new Error(
      'L’échéance doit être postérieure à la date de départ.',
    );
  }

  if (
    input.metric === 'weightTarget' &&
    (!input.baselineValue ||
      !Number.isFinite(input.baselineValue))
  ) {
    throw new Error(
      'Indique le poids de départ pour calculer la progression.',
    );
  }

  const existing = goalId
    ? state.goals.find(({ id }) => id === goalId)
    : undefined;

  const title =
    input.title.trim() || metricDefinition.label;

  const goal: Goal = {
    id: existing?.id ?? crypto.randomUUID(),
    title,
    metric: input.metric,
    targetValue: input.targetValue,
    startDate: input.startDate,
    status: existing?.status ?? 'active',
    reachedMilestones:
      existing?.reachedMilestones ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...(input.deadline
      ? { deadline: input.deadline }
      : {}),
    ...(input.baselineValue !== undefined
      ? { baselineValue: input.baselineValue }
      : {}),
    ...(existing?.completedAt
      ? { completedAt: existing.completedAt }
      : {}),
  };

  persistGoals(
    existing
      ? state.goals.map((candidate) =>
          candidate.id === existing.id ? goal : candidate,
        )
      : [...state.goals, goal],
  );

  return goal;
}

export function updateGoalStatus(
  goalId: string,
  status: GoalStatus,
): void {
  const state = readGoalState();
  const now = new Date().toISOString();

  persistGoals(
    state.goals.map((goal) => {
      if (goal.id !== goalId) return goal;

      return {
        ...goal,
        status,
        updatedAt: now,
        ...(status === 'completed'
          ? { completedAt: goal.completedAt ?? now }
          : {}),
      };
    }),
  );
}

export async function deleteGoal(
  goalId: string,
  database: AppDatabase = appDatabase,
): Promise<void> {
  await flushGoalStatePersistence();

  const existing = await database.goals.get(goalId);
  if (!existing) return;

  const deletedAt = new Date().toISOString();
  const markerId = deletionRecordId('goal', goalId);

  await database.transaction(
    'rw',
    database.goals,
    database.deletionRecords,
    async () => {
      const currentMarker =
        await database.deletionRecords.get(markerId);

      await database.deletionRecords.put(
        createDeletedDeletionRecord(
          { entityType: 'goal', entityId: goalId },
          deletedAt,
          currentMarker,
        ),
      );
      await database.goals.delete(goalId);
    },
  );

  await reloadUserStateRuntime(database);
}
