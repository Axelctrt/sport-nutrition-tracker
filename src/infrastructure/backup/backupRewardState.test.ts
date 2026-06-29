import {
  ENDURANCE_PLANNING_STORAGE_KEY,
  writeEndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
import {
  GOAL_STATE_STORAGE_KEY,
  writeGoalState,
} from '@/domain/goals/goalState';
import {
  flushRoutineReminderCompletionPersistence,
  readRoutineReminderCompletionState,
  recordRoutineReminderCompletion,
} from '@/domain/reminders/routineReminderCompletionState';
import {
  ACHIEVEMENT_STORAGE_KEY,
  readAchievementState,
  unlockAchievements,
} from '@/domain/rewards/achievements';
import {
  activateVisualTheme,
  readVisualThemeState,
  unlockVisualThemes,
  VISUAL_THEME_STORAGE_KEY,
} from '@/domain/rewards/visualThemes';
import {
  readWeeklyMissionHistoryState,
  recordCompletedWeeklyMission,
  WEEKLY_MISSION_HISTORY_STORAGE_KEY,
} from '@/domain/rewards/weeklyMissionHistory';
import {
  BACKUP_USER_STATE_TABLE_NAMES,
  type BackupData,
} from '@/domain/models/backup';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import {
  createBackupEnvelope,
  parseBackupText,
  replaceDatabaseFromBackup,
  serializeBackupEnvelope,
} from '@/infrastructure/backup/backupService';

function createTestDatabase(): AppDatabase {
  return new AppDatabase(
    `sportpilot-reward-backup-test-${crypto.randomUUID()}`,
  );
}

const rewardStorageKeys = [
  ENDURANCE_PLANNING_STORAGE_KEY,
  GOAL_STATE_STORAGE_KEY,
  ACHIEVEMENT_STORAGE_KEY,
  VISUAL_THEME_STORAGE_KEY,
  WEEKLY_MISSION_HISTORY_STORAGE_KEY,
] as const;

describe('sauvegarde des états utilisateur', () => {
  let database: AppDatabase;

  beforeEach(async () => {
    for (const key of rewardStorageKeys) {
      window.localStorage.removeItem(key);
    }
    document.documentElement.removeAttribute('data-sport-theme');

    database = createTestDatabase();
    await initializeDatabase(database);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('exporte puis restaure toutes les tables utilisateur Dexie', async () => {
    unlockAchievements(
      ['first-session'],
      '2026-06-27T18:00:00.000Z',
    );
    unlockVisualThemes(['endurance']);
    activateVisualTheme('endurance');
    recordCompletedWeeklyMission(
      '2026-06-22',
      '2026-06-27T19:00:00.000Z',
      new Date(2026, 5, 27),
    );
    recordRoutineReminderCompletion(
      '2026-06-27',
      'weighIn',
      '2026-06-27T19:30:00.000Z',
    );
    writeGoalState({
      version: 1,
      goals: [
        {
          id: 'goal-backup',
          title: 'Marcher',
          metric: 'totalSteps',
          targetValue: 20_000,
          startDate: '2026-06-01',
          status: 'active',
          reachedMilestones: [],
          createdAt: '2026-06-01T08:00:00.000Z',
          updatedAt: '2026-06-01T08:00:00.000Z',
        },
      ],
    });
    writeEndurancePlanningState({
      version: 1,
      sessions: [
        {
          id: 'planning-backup',
          title: 'Footing',
          activityType: 'running',
          date: '2026-07-01',
          intensity: 'low',
          status: 'planned',
          createdAt: '2026-06-27T08:00:00.000Z',
          updatedAt: '2026-06-27T08:00:00.000Z',
        },
      ],
    });
    await flushRoutineReminderCompletionPersistence();

    const envelope = await createBackupEnvelope(
      database,
      '2026-06-27T20:00:00.000Z',
    );

    expect(envelope.schemaVersion).toBe(5);
    expect(envelope.rewardState).toBeUndefined();
    expect(envelope.includedUserStateTables).toEqual(
      BACKUP_USER_STATE_TABLE_NAMES,
    );
    expect(envelope.data.goals).toEqual([
      expect.objectContaining({ id: 'goal-backup' }),
    ]);
    expect(envelope.data.endurancePlanningSessions).toEqual([
      expect.objectContaining({ id: 'planning-backup' }),
    ]);
    expect(envelope.data.earnedAchievements).toEqual([
      {
        id: 'first-session',
        earnedAt: '2026-06-27T18:00:00.000Z',
        updatedAt: '2026-06-27T18:00:00.000Z',
      },
    ]);
    expect(envelope.data.unlockedVisualThemes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'classic' }),
        expect.objectContaining({ id: 'endurance' }),
      ]),
    );
    expect(envelope.data.visualThemePreferences).toEqual([
      expect.objectContaining({ activeThemeId: 'endurance' }),
    ]);
    expect(envelope.data.weeklyMissionCompletions).toEqual([
      expect.objectContaining({
        id: 'weekly-mission:2026-06-22',
      }),
    ]);
    expect(envelope.data.routineReminderCompletions).toEqual([
      expect.objectContaining({
        id: 'routine-reminder:2026-06-27:weighIn',
      }),
    ]);

    await replaceDatabaseFromBackup(envelope, database);

    expect(readAchievementState().earnedAchievements).toHaveLength(1);
    expect(readVisualThemeState().activeThemeId).toBe('endurance');
    expect(
      readWeeklyMissionHistoryState().completedWeeks,
    ).toHaveLength(1);
    expect(
      readRoutineReminderCompletionState().completions,
    ).toHaveLength(1);
    expect(await database.goals.get('goal-backup')).toBeDefined();
    expect(
      await database.endurancePlanningSessions.get(
        'planning-backup',
      ),
    ).toBeDefined();
  });

  it('migre une sauvegarde v2 sans effacer les états absents', async () => {
    unlockVisualThemes(['power']);
    activateVisualTheme('power');

    const envelope = await createBackupEnvelope(
      database,
      '2026-06-27T20:00:00.000Z',
    );
    const versionTwoEnvelope = structuredClone(envelope);

    versionTwoEnvelope.schemaVersion = 2;
    delete versionTwoEnvelope.includedUserStateTables;
    delete versionTwoEnvelope.rewardState;
    for (const tableName of BACKUP_USER_STATE_TABLE_NAMES) {
      delete versionTwoEnvelope.data[tableName as keyof BackupData];
    }

    const parsed = parseBackupText(
      serializeBackupEnvelope(versionTwoEnvelope),
    );

    expect(parsed.schemaVersion).toBe(5);
    expect(parsed.includedUserStateTables).toEqual([]);

    await replaceDatabaseFromBackup(parsed, database);

    expect(readVisualThemeState().activeThemeId).toBe('power');
  });
});
