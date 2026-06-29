import {
  hydrateGoalStateRuntime,
  type GoalState,
} from '@/domain/goals/goalState';
import {
  hydrateEndurancePlanningRuntime,
  type EndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { appDatabase } from '@/infrastructure/database/database';
import {
  migrateLegacyUserState,
  readEndurancePlanningStateFromDatabase,
  readGoalStateFromDatabase,
  replaceEndurancePlanningStateInDatabase,
  replaceGoalStateInDatabase,
} from '@/infrastructure/user-state/legacyUserStateMigration';

function configureRuntime(
  database: AppDatabase,
  goals: GoalState,
  endurancePlanning: EndurancePlanningState,
): void {
  hydrateGoalStateRuntime(
    goals,
    (state) => replaceGoalStateInDatabase(database, state),
  );
  hydrateEndurancePlanningRuntime(
    endurancePlanning,
    (state) =>
      replaceEndurancePlanningStateInDatabase(database, state),
  );
}

export async function initializeUserStateRuntime(
  database: AppDatabase = appDatabase,
): Promise<void> {
  const state = await migrateLegacyUserState(database);
  configureRuntime(
    database,
    state.goals,
    state.endurancePlanning,
  );
}

export async function reloadUserStateRuntime(
  database: AppDatabase = appDatabase,
): Promise<void> {
  const [goals, endurancePlanning] = await Promise.all([
    readGoalStateFromDatabase(database),
    readEndurancePlanningStateFromDatabase(database),
  ]);

  configureRuntime(database, goals, endurancePlanning);
}

export async function replaceGoalUserState(
  state: GoalState,
  database: AppDatabase = appDatabase,
): Promise<void> {
  await replaceGoalStateInDatabase(database, state);
  const endurancePlanning =
    await readEndurancePlanningStateFromDatabase(database);
  configureRuntime(database, state, endurancePlanning);
}

export async function replaceEndurancePlanningUserState(
  state: EndurancePlanningState,
  database: AppDatabase = appDatabase,
): Promise<void> {
  await replaceEndurancePlanningStateInDatabase(database, state);
  const goals = await readGoalStateFromDatabase(database);
  configureRuntime(database, goals, state);
}
