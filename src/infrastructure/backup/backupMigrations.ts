import {
  BACKUP_USER_STATE_TABLE_NAMES,
  type BackupEnvelope,
  type BackupUserStateTableName,
} from '@/domain/models/backup';
import {
  VISUAL_THEME_PREFERENCE_ID,
  weeklyMissionCompletionId,
} from '@/infrastructure/user-state/userStateModels';
import { validateBackupEnvelope } from '@/infrastructure/backup/backupSchemas';

export const CURRENT_BACKUP_SCHEMA_VERSION = 5;

export class BackupMigrationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'BackupMigrationError';
  }
}

interface BackupHeader {
  format?: unknown;
  schemaVersion?: unknown;
  exportedAt?: unknown;
  rewardState?: unknown;
  data?: unknown;
}

function readHeader(input: unknown): BackupHeader {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new BackupMigrationError(
      'Le fichier ne contient pas un objet de sauvegarde valide.',
    );
  }
  return input as BackupHeader;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function validTimestampOrEpoch(value: unknown): string {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
    return value;
  }
  return '1970-01-01T00:00:00.000Z';
}

function migrateVersion1ToVersion2(input: BackupHeader): unknown {
  const data = asRecord(input.data) ?? {};

  return {
    ...input,
    schemaVersion: 2,
    data: {
      ...data,
      exerciseDefinitions: [],
      workoutTemplates: [],
      workoutTemplateExercises: [],
      workoutSessions: [],
      workoutSessionExercises: [],
      strengthSets: [],
      progressionSuggestions: [],
    },
  };
}

function migrateVersion2ToVersion3(input: BackupHeader): unknown {
  return { ...input, schemaVersion: 3 };
}

function migrateVersion3ToVersion4(input: BackupHeader): unknown {
  return { ...input, schemaVersion: 4 };
}

function uniqueStrings(values: unknown[]): string[] {
  return [...new Set(values.filter((value): value is string =>
    typeof value === 'string' && value.length > 0,
  ))];
}

function migrateVersion4ToVersion5(input: BackupHeader): unknown {
  const data = asRecord(input.data) ?? {};
  const rewardState = asRecord(input.rewardState);
  const includedUserStateTables: BackupUserStateTableName[] = [];
  const exportedAt = validTimestampOrEpoch(input.exportedAt);

  const goalsState = asRecord(rewardState?.goals);
  const goals = asArray(goalsState?.goals);
  if (goalsState) includedUserStateTables.push('goals');

  const planningState = asRecord(rewardState?.endurancePlanning);
  const endurancePlanningSessions = asArray(planningState?.sessions);
  if (planningState) {
    includedUserStateTables.push('endurancePlanningSessions');
  }

  const achievementState = asRecord(rewardState?.achievements);
  const earnedAchievements = asArray(
    achievementState?.earnedAchievements,
  ).map((value) => {
    const record = asRecord(value) ?? {};
    const earnedAt = validTimestampOrEpoch(record.earnedAt);
    return {
      id: record.id,
      earnedAt,
      updatedAt: earnedAt,
    };
  });
  if (achievementState) {
    includedUserStateTables.push('earnedAchievements');
  }

  const visualThemeState = asRecord(rewardState?.visualThemes);
  const activeThemeId =
    typeof visualThemeState?.activeThemeId === 'string'
      ? visualThemeState.activeThemeId
      : undefined;
  const unlockedThemeIds = uniqueStrings(
    asArray(visualThemeState?.unlockedThemeIds),
  );
  if (activeThemeId && !unlockedThemeIds.includes(activeThemeId)) {
    unlockedThemeIds.push(activeThemeId);
  }
  const unlockedVisualThemes = unlockedThemeIds.map((id) => ({
    id,
    unlockedAt: exportedAt,
    updatedAt: exportedAt,
  }));
  const visualThemePreferences = activeThemeId
    ? [
        {
          id: VISUAL_THEME_PREFERENCE_ID,
          activeThemeId,
          updatedAt: exportedAt,
        },
      ]
    : [];
  if (visualThemeState) {
    includedUserStateTables.push(
      'unlockedVisualThemes',
      'visualThemePreferences',
    );
  }

  const weeklyMissionState = asRecord(rewardState?.weeklyMissions);
  const weeklyMissionCompletions = asArray(
    weeklyMissionState?.completedWeeks,
  ).map((value) => {
    const record = asRecord(value) ?? {};
    const weekStart = record.weekStart;
    const completedAt = validTimestampOrEpoch(record.completedAt);
    return {
      id:
        typeof weekStart === 'string'
          ? weeklyMissionCompletionId(weekStart)
          : '',
      weekStart,
      completedAt,
      updatedAt: completedAt,
    };
  });
  if (weeklyMissionState) {
    includedUserStateTables.push('weeklyMissionCompletions');
  }

  const {
    rewardState: _legacyRewardState,
    ...headerWithoutRewardState
  } = input;

  return {
    ...headerWithoutRewardState,
    schemaVersion: 5,
    includedUserStateTables,
    data: {
      ...data,
      goals,
      endurancePlanningSessions,
      earnedAchievements,
      unlockedVisualThemes,
      visualThemePreferences,
      weeklyMissionCompletions,
      routineReminderCompletions: [],
    },
  };
}

export function migrateBackupEnvelope(input: unknown): BackupEnvelope {
  const header = readHeader(input);

  if (header.format !== 'sportpilot-backup') {
    throw new BackupMigrationError(
      'Ce fichier n’est pas une sauvegarde SportPilot reconnue.',
    );
  }

  if (!Number.isInteger(header.schemaVersion)) {
    throw new BackupMigrationError(
      'La version de schéma de la sauvegarde est absente ou invalide.',
    );
  }

  const version = Number(header.schemaVersion);
  if (version > CURRENT_BACKUP_SCHEMA_VERSION) {
    throw new BackupMigrationError(
      `Cette sauvegarde utilise la version ${version}, plus récente que la version ${CURRENT_BACKUP_SCHEMA_VERSION} prise en charge. Mets d’abord l’application à jour.`,
    );
  }

  if (version < 1) {
    throw new BackupMigrationError(
      `La version de sauvegarde ${version} n’est pas prise en charge.`,
    );
  }

  let migrated: unknown = input;

  if (version === 1) {
    migrated = migrateVersion1ToVersion2(header);
  }
  if (version <= 2) {
    migrated = migrateVersion2ToVersion3(readHeader(migrated));
  }
  if (version <= 3) {
    migrated = migrateVersion3ToVersion4(readHeader(migrated));
  }
  if (version <= 4) {
    migrated = migrateVersion4ToVersion5(readHeader(migrated));
  }

  const validated = validateBackupEnvelope(migrated);

  if (
    validated.schemaVersion === CURRENT_BACKUP_SCHEMA_VERSION &&
    validated.includedUserStateTables?.some(
      (tableName) => !BACKUP_USER_STATE_TABLE_NAMES.includes(tableName),
    )
  ) {
    throw new BackupMigrationError(
      'La sauvegarde contient une table d’état utilisateur inconnue.',
    );
  }

  return validated;
}
