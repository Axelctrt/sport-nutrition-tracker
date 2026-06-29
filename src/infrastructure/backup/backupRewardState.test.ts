import {
  ENDURANCE_PLANNING_STORAGE_KEY,
  flushEndurancePlanningPersistence,
  writeEndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
import {
  GOAL_STATE_STORAGE_KEY,
  flushGoalStatePersistence,
  writeGoalState,
} from '@/domain/goals/goalState';
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

describe('sauvegarde des récompenses', () => {
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

  it('exporte puis restaure les badges, thèmes, missions et objectifs', async () => {
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
    await Promise.all([
      flushGoalStatePersistence(),
      flushEndurancePlanningPersistence(),
    ]);

    const envelope = await createBackupEnvelope(
      database,
      '2026-06-27T20:00:00.000Z',
    );

    expect(envelope.schemaVersion).toBe(4);
    expect(envelope.rewardState).toEqual({
      endurancePlanning: {
        version: 1,
        sessions: [
          expect.objectContaining({ id: 'planning-backup' }),
        ],
      },
      goals: {
        version: 1,
        goals: [
          expect.objectContaining({ id: 'goal-backup' }),
        ],
      },
      achievements: {
        earnedAchievements: [
          {
            id: 'first-session',
            earnedAt: '2026-06-27T18:00:00.000Z',
          },
        ],
      },
      visualThemes: {
        activeThemeId: 'endurance',
        unlockedThemeIds: ['classic', 'endurance'],
      },
      weeklyMissions: {
        completedWeeks: [
          {
            weekStart: '2026-06-22',
            completedAt: '2026-06-27T19:00:00.000Z',
          },
        ],
      },
    });

    for (const key of rewardStorageKeys) {
      window.localStorage.removeItem(key);
    }

    await replaceDatabaseFromBackup(envelope, database);

    expect(readAchievementState().earnedAchievements).toHaveLength(
      1,
    );
    expect(readVisualThemeState().activeThemeId).toBe('endurance');
    expect(
      readWeeklyMissionHistoryState().completedWeeks,
    ).toHaveLength(1);
    expect(await database.goals.get('goal-backup')).toBeDefined();
    expect(
      await database.endurancePlanningSessions.get(
        'planning-backup',
      ),
    ).toBeDefined();
  });

  it('migre une sauvegarde v2 sans effacer les récompenses locales', async () => {
    unlockVisualThemes(['power']);
    activateVisualTheme('power');

    const envelope = await createBackupEnvelope(
      database,
      '2026-06-27T20:00:00.000Z',
    );
    const versionTwoEnvelope = structuredClone(envelope);

    versionTwoEnvelope.schemaVersion = 2;
    delete versionTwoEnvelope.rewardState;

    const parsed = parseBackupText(
      serializeBackupEnvelope(versionTwoEnvelope),
    );

    expect(parsed.schemaVersion).toBe(4);
    expect(parsed.rewardState).toBeUndefined();

    await replaceDatabaseFromBackup(parsed, database);

    expect(readVisualThemeState().activeThemeId).toBe('power');
  });
});
