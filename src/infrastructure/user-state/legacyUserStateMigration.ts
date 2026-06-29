import type { Table } from 'dexie';

import {
  GOAL_STATE_STORAGE_KEY,
  emptyGoalState,
  parseGoalState,
  type GoalState,
} from '@/domain/goals/goalState';
import {
  ENDURANCE_PLANNING_STORAGE_KEY,
  emptyEndurancePlanningState,
  parseEndurancePlanningState,
  type EndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';

interface LegacyStateSnapshot<T> {
  present: boolean;
  state?: T;
}

export interface MigratedUserState {
  goals: GoalState;
  endurancePlanning: EndurancePlanningState;
}

function readLegacyState<T>(
  key: string,
  parse: (value: unknown) => T | undefined,
): LegacyStateSnapshot<T> {
  if (typeof window === 'undefined') {
    return { present: false };
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (raw === null) {
      return { present: false };
    }

    const state = parse(JSON.parse(raw));

    return state === undefined
      ? { present: true }
      : { present: true, state };
  } catch {
    return { present: true };
  }
}

function removeLegacyState(key: string): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // La donnée est déjà durablement enregistrée dans Dexie. Une clé
    // historique impossible à supprimer sera retentée au prochain démarrage.
  }
}

function sortByCreatedAt<T extends { id: string; createdAt: string }>(
  values: T[],
): T[] {
  return [...values].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt) ||
    left.id.localeCompare(right.id),
  );
}

function canonicalizeById<T extends { id: string }>(values: T[]): T[] {
  return [...values].sort((left, right) => left.id.localeCompare(right.id));
}

function assertPersistedState<T extends { id: string }>(
  expected: T[],
  actual: T[],
  label: string,
): void {
  if (
    JSON.stringify(canonicalizeById(actual)) !==
    JSON.stringify(canonicalizeById(expected))
  ) {
    throw new Error(`${label} n’a pas été vérifié après écriture.`);
  }
}

async function replaceTable<T extends { id: string }>(
  table: Table<T, string>,
  values: T[],
): Promise<void> {
  await table.clear();

  if (values.length > 0) {
    await table.bulkPut(values);
  }
}

export async function readGoalStateFromDatabase(
  database: AppDatabase,
): Promise<GoalState> {
  return {
    version: 1,
    goals: sortByCreatedAt(await database.goals.toArray()),
  };
}

export async function readEndurancePlanningStateFromDatabase(
  database: AppDatabase,
): Promise<EndurancePlanningState> {
  return {
    version: 1,
    sessions: sortByCreatedAt(
      await database.endurancePlanningSessions.toArray(),
    ),
  };
}

export async function replaceGoalStateInDatabase(
  database: AppDatabase,
  state: GoalState,
): Promise<void> {
  await database.transaction('rw', database.goals, async () => {
    await replaceTable(database.goals, state.goals);
  });
}

export async function replaceEndurancePlanningStateInDatabase(
  database: AppDatabase,
  state: EndurancePlanningState,
): Promise<void> {
  await database.transaction(
    'rw',
    database.endurancePlanningSessions,
    async () => {
      await replaceTable(
        database.endurancePlanningSessions,
        state.sessions,
      );
    },
  );
}

async function migrateGoalState(
  database: AppDatabase,
): Promise<GoalState> {
  const legacy = readLegacyState(
    GOAL_STATE_STORAGE_KEY,
    parseGoalState,
  );

  if (!legacy.present || legacy.state === undefined) {
    return readGoalStateFromDatabase(database);
  }

  await replaceGoalStateInDatabase(database, legacy.state);
  const persisted = await database.goals.toArray();
  assertPersistedState(
    legacy.state.goals,
    persisted,
    'La migration des objectifs',
  );
  removeLegacyState(GOAL_STATE_STORAGE_KEY);

  return legacy.state;
}

async function migrateEndurancePlanningState(
  database: AppDatabase,
): Promise<EndurancePlanningState> {
  const legacy = readLegacyState(
    ENDURANCE_PLANNING_STORAGE_KEY,
    parseEndurancePlanningState,
  );

  if (!legacy.present || legacy.state === undefined) {
    return readEndurancePlanningStateFromDatabase(database);
  }

  await replaceEndurancePlanningStateInDatabase(database, legacy.state);
  const persisted = await database.endurancePlanningSessions.toArray();
  assertPersistedState(
    legacy.state.sessions,
    persisted,
    'La migration du planning d’endurance',
  );
  removeLegacyState(ENDURANCE_PLANNING_STORAGE_KEY);

  return legacy.state;
}

export async function migrateLegacyUserState(
  database: AppDatabase,
): Promise<MigratedUserState> {
  const [goals, endurancePlanning] = await Promise.all([
    migrateGoalState(database),
    migrateEndurancePlanningState(database),
  ]);

  return {
    goals: goals ?? emptyGoalState(),
    endurancePlanning:
      endurancePlanning ?? emptyEndurancePlanningState(),
  };
}
