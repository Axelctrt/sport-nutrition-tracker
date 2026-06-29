import {
  hydrateGoalStateRuntime,
  type GoalState,
} from '@/domain/goals/goalState';
import {
  hydrateEndurancePlanningRuntime,
  type EndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
import {
  hydrateRoutineReminderCompletionRuntime,
  type RoutineReminderCompletionState,
} from '@/domain/reminders/routineReminderCompletionState';
import {
  hydrateAchievementStateRuntime,
  type AchievementState,
} from '@/domain/rewards/achievements';
import {
  hydrateVisualThemeStateRuntime,
  type VisualThemeState,
} from '@/domain/rewards/visualThemes';
import {
  hydrateWeeklyMissionHistoryRuntime,
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
    (value) => replaceAchievementStateInDatabase(database, value),
  );
  hydrateVisualThemeStateRuntime(
    state.visualThemes,
    (value) => replaceVisualThemeStateInDatabase(database, value),
  );
  hydrateWeeklyMissionHistoryRuntime(
    state.weeklyMissions,
    (value) =>
      replaceWeeklyMissionHistoryStateInDatabase(database, value),
  );
  hydrateRoutineReminderCompletionRuntime(
    state.routineReminderCompletions,
    (value) =>
      replaceRoutineReminderCompletionStateInDatabase(database, value),
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

export async function initializeUserStateRuntime(
  database: AppDatabase = appDatabase,
): Promise<void> {
  const state = await migrateLegacyUserState(database);
  configureRuntime(database, state);
}

export async function reloadUserStateRuntime(
  database: AppDatabase = appDatabase,
): Promise<void> {
  configureRuntime(database, await readRuntimeSnapshot(database));
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
