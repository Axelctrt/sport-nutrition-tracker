import {
  notifySyncLocalDataChanged,
} from '@/application/sync/syncLocalChangeEvents';
import {
  flushGoalStatePersistence,
  GOAL_STATE_CHANGED_EVENT,
  hydrateGoalStateRuntime,
  type GoalState,
} from '@/domain/goals/goalState';
import {
  ENDURANCE_PLANNING_CHANGED_EVENT,
  flushEndurancePlanningPersistence,
  hydrateEndurancePlanningRuntime,
  type EndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
import {
  flushRoutineReminderCompletionPersistence,
  hydrateRoutineReminderCompletionRuntime,
  type RoutineReminderCompletionState,
} from '@/domain/reminders/routineReminderCompletionState';
import {
  flushAchievementStatePersistence,
  hydrateAchievementStateRuntime,
  type AchievementState,
} from '@/domain/rewards/achievements';
import {
  applyStoredVisualTheme,
  flushVisualThemeStatePersistence,
  hydrateVisualThemeStateRuntime,
  type VisualThemeState,
} from '@/domain/rewards/visualThemes';
import {
  flushWeeklyMissionHistoryPersistence,
  hydrateWeeklyMissionHistoryRuntime,
  WEEKLY_MISSION_HISTORY_CHANGED_EVENT,
  type WeeklyMissionHistoryState,
} from '@/domain/rewards/weeklyMissionHistory';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { appDatabase } from '@/infrastructure/database/database';
import {
  migrateLegacyUserState,
  readAchievementStateFromDatabase,
  readEndurancePlanningStateFromDatabase,
  readGoalStateFromDatabase,
  readRoutineReminderCompletionStateFromDatabase,
  readVisualThemeStateFromDatabase,
  readWeeklyMissionHistoryStateFromDatabase,
  replaceAchievementStateInDatabase,
  replaceEndurancePlanningStateInDatabase,
  replaceGoalStateInDatabase,
  replaceRoutineReminderCompletionStateInDatabase,
  replaceVisualThemeStateInDatabase,
  replaceWeeklyMissionHistoryStateInDatabase,
} from '@/infrastructure/user-state/legacyUserStateMigration';

interface UserStateRuntimeSnapshot {
  goals: GoalState;
  endurancePlanning: EndurancePlanningState;
  achievements: AchievementState;
  visualThemes: VisualThemeState;
  weeklyMissions: WeeklyMissionHistoryState;
  routineReminderCompletions: RoutineReminderCompletionState;
}

type RewardsPersistenceReason =
  | 'achievement-state-write'
  | 'visual-theme-state-write'
  | 'weekly-mission-state-write'
  | 'routine-reminder-completion-write';

async function persistRewardsState(
  reason: RewardsPersistenceReason,
  persist: () => Promise<void>,
): Promise<void> {
  await persist();
  notifySyncLocalDataChanged(['rewards-routines'], reason);
}

function configureRuntime(
  database: AppDatabase,
  state: UserStateRuntimeSnapshot,
): void {
  hydrateGoalStateRuntime(
    state.goals,
    (value) => replaceGoalStateInDatabase(database, value),
  );
  hydrateEndurancePlanningRuntime(
    state.endurancePlanning,
    (value) =>
      replaceEndurancePlanningStateInDatabase(database, value),
  );
  hydrateAchievementStateRuntime(
    state.achievements,
    (value) => persistRewardsState(
      'achievement-state-write',
      () => replaceAchievementStateInDatabase(database, value),
    ),
  );
  hydrateVisualThemeStateRuntime(
    state.visualThemes,
    (value) => persistRewardsState(
      'visual-theme-state-write',
      () => replaceVisualThemeStateInDatabase(database, value),
    ),
  );
  hydrateWeeklyMissionHistoryRuntime(
    state.weeklyMissions,
    (value) => persistRewardsState(
      'weekly-mission-state-write',
      () => replaceWeeklyMissionHistoryStateInDatabase(database, value),
    ),
  );
  hydrateRoutineReminderCompletionRuntime(
    state.routineReminderCompletions,
    (value) => persistRewardsState(
      'routine-reminder-completion-write',
      () => replaceRoutineReminderCompletionStateInDatabase(database, value),
    ),
  );
}

async function readRuntimeSnapshot(
  database: AppDatabase,
): Promise<UserStateRuntimeSnapshot> {
  const [
    goals,
    endurancePlanning,
    achievements,
    visualThemes,
    weeklyMissions,
    routineReminderCompletions,
  ] = await Promise.all([
    readGoalStateFromDatabase(database),
    readEndurancePlanningStateFromDatabase(database),
    readAchievementStateFromDatabase(database),
    readVisualThemeStateFromDatabase(database),
    readWeeklyMissionHistoryStateFromDatabase(database),
    readRoutineReminderCompletionStateFromDatabase(database),
  ]);

  return {
    goals,
    endurancePlanning,
    achievements,
    visualThemes,
    weeklyMissions,
    routineReminderCompletions,
  };
}

export async function flushUserStatePersistence(): Promise<void> {
  await Promise.all([
    flushGoalStatePersistence(),
    flushEndurancePlanningPersistence(),
    flushAchievementStatePersistence(),
    flushVisualThemeStatePersistence(),
    flushWeeklyMissionHistoryPersistence(),
    flushRoutineReminderCompletionPersistence(),
  ]);
}

function notifyReloadedUserState(): void {
  if (typeof window === 'undefined') return;

  applyStoredVisualTheme();
  window.dispatchEvent(new Event(GOAL_STATE_CHANGED_EVENT));
  window.dispatchEvent(
    new Event(ENDURANCE_PLANNING_CHANGED_EVENT),
  );
  window.dispatchEvent(
    new Event(WEEKLY_MISSION_HISTORY_CHANGED_EVENT),
  );
}

export async function initializeUserStateRuntime(
  database: AppDatabase = appDatabase,
): Promise<void> {
  const state = await migrateLegacyUserState(database);
  configureRuntime(database, state);
  applyStoredVisualTheme();
}

export async function reloadUserStateRuntime(
  database: AppDatabase = appDatabase,
): Promise<void> {
  // A reload replaces the in-memory runtimes with a fresh Dexie snapshot.
  // Flush queued writes first so a concurrent cloud/domain refresh cannot
  // rehydrate an older snapshot over a user mutation that is still pending.
  await flushUserStatePersistence();
  configureRuntime(database, await readRuntimeSnapshot(database));
  notifyReloadedUserState();
}

async function replaceAndReload(
  database: AppDatabase,
  replace: () => Promise<void>,
): Promise<void> {
  await replace();
  configureRuntime(database, await readRuntimeSnapshot(database));
}

export async function replaceGoalUserState(
  state: GoalState,
  database: AppDatabase = appDatabase,
): Promise<void> {
  await replaceAndReload(
    database,
    () => replaceGoalStateInDatabase(database, state),
  );
}

export async function replaceEndurancePlanningUserState(
  state: EndurancePlanningState,
  database: AppDatabase = appDatabase,
): Promise<void> {
  await replaceAndReload(
    database,
    () => replaceEndurancePlanningStateInDatabase(database, state),
  );
}

export async function replaceAchievementUserState(
  state: AchievementState,
  database: AppDatabase = appDatabase,
): Promise<void> {
  await replaceAndReload(
    database,
    () => replaceAchievementStateInDatabase(database, state),
  );
}

export async function replaceVisualThemeUserState(
  state: VisualThemeState,
  database: AppDatabase = appDatabase,
): Promise<void> {
  await replaceAndReload(
    database,
    () => replaceVisualThemeStateInDatabase(database, state),
  );
}

export async function replaceWeeklyMissionUserState(
  state: WeeklyMissionHistoryState,
  database: AppDatabase = appDatabase,
): Promise<void> {
  await replaceAndReload(
    database,
    () =>
      replaceWeeklyMissionHistoryStateInDatabase(database, state),
  );
}

export async function replaceRoutineReminderCompletionUserState(
  state: RoutineReminderCompletionState,
  database: AppDatabase = appDatabase,
): Promise<void> {
  await replaceAndReload(
    database,
    () =>
      replaceRoutineReminderCompletionStateInDatabase(database, state),
  );
}
