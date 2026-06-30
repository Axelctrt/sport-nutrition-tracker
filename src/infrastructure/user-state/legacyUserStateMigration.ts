import type { Table } from 'dexie';

import {
  GOAL_STATE_STORAGE_KEY,
  emptyGoalState,
  parseGoalState,
  type GoalState,
} from '@/domain/goals/goalState';
import type { LocalDate } from '@/domain/models/common';
import {
  ENDURANCE_PLANNING_STORAGE_KEY,
  emptyEndurancePlanningState,
  parseEndurancePlanningState,
  type EndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
import {
  ROUTINE_REMINDER_TYPES,
  type RoutineReminderType,
} from '@/domain/reminders/routineReminder';
import {
  ROUTINE_REMINDER_COMPLETION_STORAGE_KEY,
  ROUTINE_REMINDER_DEVICE_STORAGE_KEY,
  emptyRoutineReminderCompletionState,
  parseRoutineReminderCompletionState,
  type RoutineReminderCompletion,
  type RoutineReminderCompletionState,
} from '@/domain/reminders/routineReminderCompletionState';
import {
  ACHIEVEMENT_STORAGE_KEY,
  emptyAchievementState,
  parseAchievementState,
  type AchievementState,
} from '@/domain/rewards/achievements';
import {
  DEFAULT_VISUAL_THEME_ID,
  VISUAL_THEME_STORAGE_KEY,
  emptyVisualThemeState,
  parseVisualThemeState,
  visualThemeCatalog,
  type VisualThemeId,
  type VisualThemeState,
} from '@/domain/rewards/visualThemes';
import {
  WEEKLY_MISSION_HISTORY_STORAGE_KEY,
  emptyWeeklyMissionHistoryState,
  parseWeeklyMissionHistoryState,
  type WeeklyMissionHistoryState,
} from '@/domain/rewards/weeklyMissionHistory';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  VISUAL_THEME_PREFERENCE_ID,
  routineReminderCompletionId,
  weeklyMissionCompletionId,
  type CompletedWeeklyMissionRecord,
  type EarnedAchievementRecord,
  type RoutineReminderCompletionRecord,
  type UnlockedVisualThemeRecord,
  type VisualThemePreferenceRecord,
} from '@/infrastructure/user-state/userStateModels';

interface LegacyStateSnapshot<T> {
  present: boolean;
  state?: T;
}

interface RoutineReminderDeviceDayState {
  lastShownAt?: Partial<Record<RoutineReminderType, string>>;
  snoozedUntil?: Partial<Record<RoutineReminderType, string>>;
}

interface RoutineReminderDeviceLedger {
  version: 1;
  days: Record<LocalDate, RoutineReminderDeviceDayState>;
}

interface LegacyRoutineReminderSnapshot {
  present: boolean;
  valid: boolean;
  deviceLedger?: RoutineReminderDeviceLedger;
  completionState?: RoutineReminderCompletionState;
}

export interface MigratedUserState {
  goals: GoalState;
  endurancePlanning: EndurancePlanningState;
  achievements: AchievementState;
  visualThemes: VisualThemeState;
  weeklyMissions: WeeklyMissionHistoryState;
  routineReminderCompletions: RoutineReminderCompletionState;
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
    // La donnée est déjà durablement enregistrée dans Dexie.
  }
}

function writeLegacyState(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Les complétions sont déjà vérifiées dans Dexie. L’ancien registre
    // pourra être retraité au prochain démarrage si sa réécriture échoue.
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
  return [...values].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

function assertPersistedRecords<T extends { id: string }>(
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

export async function readAchievementStateFromDatabase(
  database: AppDatabase,
): Promise<AchievementState> {
  const records = await database.earnedAchievements.toArray();

  return {
    earnedAchievements: records
      .map(({ id, earnedAt }) => ({ id, earnedAt }))
      .sort((left, right) =>
        left.earnedAt.localeCompare(right.earnedAt) ||
        left.id.localeCompare(right.id),
      ),
  };
}

export async function readVisualThemeStateFromDatabase(
  database: AppDatabase,
): Promise<VisualThemeState> {
  const [records, preference] = await Promise.all([
    database.unlockedVisualThemes.toArray(),
    database.visualThemePreferences.get(VISUAL_THEME_PREFERENCE_ID),
  ]);
  const catalogOrder = new Map(
    visualThemeCatalog.map((theme, index) => [theme.id, index]),
  );
  const unlockedThemeIds = Array.from(
    new Set<VisualThemeId>([
      DEFAULT_VISUAL_THEME_ID,
      ...records.map((record) => record.id),
    ]),
  ).sort(
    (left, right) =>
      (catalogOrder.get(left) ?? 0) - (catalogOrder.get(right) ?? 0),
  );
  const activeThemeId =
    preference && unlockedThemeIds.includes(preference.activeThemeId)
      ? preference.activeThemeId
      : DEFAULT_VISUAL_THEME_ID;

  return { activeThemeId, unlockedThemeIds };
}

export async function readWeeklyMissionHistoryStateFromDatabase(
  database: AppDatabase,
): Promise<WeeklyMissionHistoryState> {
  const records = await database.weeklyMissionCompletions.toArray();

  return {
    completedWeeks: records
      .map(({ weekStart, completedAt }) => ({
        weekStart,
        completedAt,
      }))
      .sort((left, right) =>
        left.weekStart.localeCompare(right.weekStart),
      ),
  };
}

export async function readRoutineReminderCompletionStateFromDatabase(
  database: AppDatabase,
): Promise<RoutineReminderCompletionState> {
  const records = await database.routineReminderCompletions.toArray();

  return {
    version: 1,
    completions: records
      .map(({ date, type, completedAt }) => ({
        date,
        type,
        completedAt,
      }))
      .sort((left, right) =>
        left.date.localeCompare(right.date) ||
        left.type.localeCompare(right.type),
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

export async function replaceAchievementStateInDatabase(
  database: AppDatabase,
  state: AchievementState,
): Promise<void> {
  const records: EarnedAchievementRecord[] =
    state.earnedAchievements.map((achievement) => ({
      ...achievement,
      updatedAt: achievement.earnedAt,
    }));

  await database.transaction(
    'rw',
    database.earnedAchievements,
    async () => {
      await replaceTable(database.earnedAchievements, records);
    },
  );
}

export async function replaceVisualThemeStateInDatabase(
  database: AppDatabase,
  state: VisualThemeState,
  updatedAt: string = new Date().toISOString(),
): Promise<void> {
  await database.transaction(
    'rw',
    database.unlockedVisualThemes,
    database.visualThemePreferences,
    async () => {
      const existing = new Map(
        (await database.unlockedVisualThemes.toArray()).map((record) => [
          record.id,
          record,
        ]),
      );
      const records: UnlockedVisualThemeRecord[] =
        state.unlockedThemeIds.map((id) => {
          const current = existing.get(id);
          return current ?? {
            id,
            unlockedAt: updatedAt,
            updatedAt,
          };
        });
      const currentPreference =
        await database.visualThemePreferences.get(
          VISUAL_THEME_PREFERENCE_ID,
        );
      const preference: VisualThemePreferenceRecord = {
        id: VISUAL_THEME_PREFERENCE_ID,
        activeThemeId: state.activeThemeId,
        updatedAt:
          currentPreference?.activeThemeId === state.activeThemeId
            ? currentPreference.updatedAt
            : updatedAt,
      };

      await replaceTable(database.unlockedVisualThemes, records);
      await database.visualThemePreferences.put(preference);
    },
  );
}

export async function replaceWeeklyMissionHistoryStateInDatabase(
  database: AppDatabase,
  state: WeeklyMissionHistoryState,
): Promise<void> {
  const records: CompletedWeeklyMissionRecord[] =
    state.completedWeeks.map((completion) => ({
      id: weeklyMissionCompletionId(completion.weekStart),
      ...completion,
      updatedAt: completion.completedAt,
    }));

  await database.transaction(
    'rw',
    database.weeklyMissionCompletions,
    async () => {
      await replaceTable(database.weeklyMissionCompletions, records);
    },
  );
}

export async function replaceRoutineReminderCompletionStateInDatabase(
  database: AppDatabase,
  state: RoutineReminderCompletionState,
): Promise<void> {
  const records: RoutineReminderCompletionRecord[] =
    state.completions.map((completion) => ({
      id: routineReminderCompletionId(
        completion.date,
        completion.type,
      ),
      ...completion,
      updatedAt: completion.completedAt,
    }));

  await database.transaction(
    'rw',
    database.routineReminderCompletions,
    async () => {
      await replaceTable(database.routineReminderCompletions, records);
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
  assertPersistedRecords(
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
  assertPersistedRecords(
    legacy.state.sessions,
    persisted,
    'La migration du planning d’endurance',
  );
  removeLegacyState(ENDURANCE_PLANNING_STORAGE_KEY);

  return legacy.state;
}

async function migrateAchievementState(
  database: AppDatabase,
): Promise<AchievementState> {
  const legacy = readLegacyState(
    ACHIEVEMENT_STORAGE_KEY,
    parseAchievementState,
  );

  if (!legacy.present || legacy.state === undefined) {
    return readAchievementStateFromDatabase(database);
  }

  await replaceAchievementStateInDatabase(database, legacy.state);
  const persisted = await readAchievementStateFromDatabase(database);

  if (JSON.stringify(persisted) !== JSON.stringify(legacy.state)) {
    throw new Error(
      'La migration des badges n’a pas été vérifiée après écriture.',
    );
  }

  removeLegacyState(ACHIEVEMENT_STORAGE_KEY);
  return legacy.state;
}

async function migrateVisualThemeState(
  database: AppDatabase,
): Promise<VisualThemeState> {
  const legacy = readLegacyState(
    VISUAL_THEME_STORAGE_KEY,
    parseVisualThemeState,
  );

  if (!legacy.present || legacy.state === undefined) {
    return readVisualThemeStateFromDatabase(database);
  }

  await replaceVisualThemeStateInDatabase(database, legacy.state);
  const persisted = await readVisualThemeStateFromDatabase(database);

  if (JSON.stringify(persisted) !== JSON.stringify(legacy.state)) {
    throw new Error(
      'La migration des thèmes n’a pas été vérifiée après écriture.',
    );
  }

  removeLegacyState(VISUAL_THEME_STORAGE_KEY);
  return legacy.state;
}

async function migrateWeeklyMissionState(
  database: AppDatabase,
): Promise<WeeklyMissionHistoryState> {
  const legacy = readLegacyState(
    WEEKLY_MISSION_HISTORY_STORAGE_KEY,
    parseWeeklyMissionHistoryState,
  );

  if (!legacy.present || legacy.state === undefined) {
    return readWeeklyMissionHistoryStateFromDatabase(database);
  }

  await replaceWeeklyMissionHistoryStateInDatabase(
    database,
    legacy.state,
  );
  const persisted =
    await readWeeklyMissionHistoryStateFromDatabase(database);

  if (JSON.stringify(persisted) !== JSON.stringify(legacy.state)) {
    throw new Error(
      'La migration des missions n’a pas été vérifiée après écriture.',
    );
  }

  removeLegacyState(WEEKLY_MISSION_HISTORY_STORAGE_KEY);
  return legacy.state;
}

function isLocalDate(value: string): value is LocalDate {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function readReminderField(
  value: unknown,
): Partial<Record<RoutineReminderType, string>> | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const result: Partial<Record<RoutineReminderType, string>> = {};

  for (const type of ROUTINE_REMINDER_TYPES) {
    const candidate = (value as Record<string, unknown>)[type];
    if (typeof candidate === 'string' && candidate.length > 0) {
      result[type] = candidate;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function readLegacyRoutineReminderLedger(): LegacyRoutineReminderSnapshot {
  if (typeof window === 'undefined') {
    return { present: false, valid: false };
  }

  try {
    const raw = window.localStorage.getItem(
      ROUTINE_REMINDER_DEVICE_STORAGE_KEY,
    );

    if (raw === null) {
      return { present: false, valid: false };
    }

    const parsed = JSON.parse(raw) as {
      version?: unknown;
      days?: unknown;
    };

    if (
      parsed.version !== 1 ||
      !parsed.days ||
      typeof parsed.days !== 'object'
    ) {
      return { present: true, valid: false };
    }

    const days: Record<LocalDate, RoutineReminderDeviceDayState> = {};
    const completions: RoutineReminderCompletion[] = [];

    for (const [date, rawDay] of Object.entries(parsed.days)) {
      if (!isLocalDate(date) || !rawDay || typeof rawDay !== 'object') {
        continue;
      }

      const day = rawDay as Record<string, unknown>;
      const lastShownAt = readReminderField(day.lastShownAt);
      const snoozedUntil = readReminderField(day.snoozedUntil);
      const completedAt = readReminderField(day.completedAt);

      if (lastShownAt || snoozedUntil) {
        days[date] = {
          ...(lastShownAt ? { lastShownAt } : {}),
          ...(snoozedUntil ? { snoozedUntil } : {}),
        };
      }

      for (const type of ROUTINE_REMINDER_TYPES) {
        const completion = completedAt?.[type];
        if (completion) {
          completions.push({ date, type, completedAt: completion });
        }
      }
    }

    return {
      present: true,
      valid: true,
      deviceLedger: { version: 1, days },
      completionState:
        parseRoutineReminderCompletionState({
          version: 1,
          completions,
        }) ?? emptyRoutineReminderCompletionState(),
    };
  } catch {
    return { present: true, valid: false };
  }
}

function mergeCompletionStates(
  ...states: RoutineReminderCompletionState[]
): RoutineReminderCompletionState {
  const merged = parseRoutineReminderCompletionState({
    version: 1,
    completions: states.flatMap((state) => state.completions),
  });

  return merged ?? emptyRoutineReminderCompletionState();
}

async function migrateRoutineReminderCompletions(
  database: AppDatabase,
): Promise<RoutineReminderCompletionState> {
  const mixedLedger = readLegacyRoutineReminderLedger();
  const fallback = readLegacyState(
    ROUTINE_REMINDER_COMPLETION_STORAGE_KEY,
    parseRoutineReminderCompletionState,
  );
  const existing =
    await readRoutineReminderCompletionStateFromDatabase(database);
  const statesToMerge = [existing];

  if (mixedLedger.valid && mixedLedger.completionState) {
    statesToMerge.push(mixedLedger.completionState);
  }
  if (fallback.state) {
    statesToMerge.push(fallback.state);
  }

  const merged = mergeCompletionStates(...statesToMerge);

  if (
    mixedLedger.valid ||
    fallback.state !== undefined
  ) {
    await replaceRoutineReminderCompletionStateInDatabase(
      database,
      merged,
    );
    const persisted =
      await readRoutineReminderCompletionStateFromDatabase(database);

    if (JSON.stringify(persisted) !== JSON.stringify(merged)) {
      throw new Error(
        'La migration des complétions de rappels n’a pas été vérifiée après écriture.',
      );
    }
  }

  if (mixedLedger.valid && mixedLedger.deviceLedger) {
    writeLegacyState(
      ROUTINE_REMINDER_DEVICE_STORAGE_KEY,
      mixedLedger.deviceLedger,
    );
  }
  if (fallback.state) {
    removeLegacyState(ROUTINE_REMINDER_COMPLETION_STORAGE_KEY);
  }

  return merged;
}

export async function migrateLegacyUserState(
  database: AppDatabase,
): Promise<MigratedUserState> {
  const [
    goals,
    endurancePlanning,
    achievements,
    visualThemes,
    weeklyMissions,
    routineReminderCompletions,
  ] = await Promise.all([
    migrateGoalState(database),
    migrateEndurancePlanningState(database),
    migrateAchievementState(database),
    migrateVisualThemeState(database),
    migrateWeeklyMissionState(database),
    migrateRoutineReminderCompletions(database),
  ]);

  return {
    goals: goals ?? emptyGoalState(),
    endurancePlanning:
      endurancePlanning ?? emptyEndurancePlanningState(),
    achievements: achievements ?? emptyAchievementState(),
    visualThemes: visualThemes ?? emptyVisualThemeState(),
    weeklyMissions:
      weeklyMissions ?? emptyWeeklyMissionHistoryState(),
    routineReminderCompletions:
      routineReminderCompletions ??
      emptyRoutineReminderCompletionState(),
  };
}
