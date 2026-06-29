import {
  GOAL_STATE_STORAGE_KEY,
  type GoalState,
} from '@/domain/goals/goalState';
import {
  ENDURANCE_PLANNING_STORAGE_KEY,
  type EndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
import {
  ROUTINE_REMINDER_COMPLETION_STORAGE_KEY,
  ROUTINE_REMINDER_DEVICE_STORAGE_KEY,
} from '@/domain/reminders/routineReminderCompletionState';
import { ACHIEVEMENT_STORAGE_KEY } from '@/domain/rewards/achievements';
import { VISUAL_THEME_STORAGE_KEY } from '@/domain/rewards/visualThemes';
import { WEEKLY_MISSION_HISTORY_STORAGE_KEY } from '@/domain/rewards/weeklyMissionHistory';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { migrateLegacyUserState } from '@/infrastructure/user-state/legacyUserStateMigration';
import {
  VISUAL_THEME_PREFERENCE_ID,
  routineReminderCompletionId,
  weeklyMissionCompletionId,
} from '@/infrastructure/user-state/userStateModels';

const goalState: GoalState = {
  version: 1,
  goals: [
    {
      id: 'goal-1',
      title: 'Marcher davantage',
      metric: 'totalSteps',
      targetValue: 50_000,
      startDate: '2026-06-01',
      status: 'active',
      reachedMilestones: [],
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-06-01T08:00:00.000Z',
    },
  ],
};

const planningState: EndurancePlanningState = {
  version: 1,
  sessions: [
    {
      id: 'plan-1',
      title: 'Footing',
      activityType: 'running',
      date: '2026-07-01',
      intensity: 'low',
      status: 'planned',
      createdAt: '2026-06-28T10:00:00.000Z',
      updatedAt: '2026-06-28T10:00:00.000Z',
    },
  ],
};

const legacyStorageKeys = [
  GOAL_STATE_STORAGE_KEY,
  ENDURANCE_PLANNING_STORAGE_KEY,
  ACHIEVEMENT_STORAGE_KEY,
  VISUAL_THEME_STORAGE_KEY,
  WEEKLY_MISSION_HISTORY_STORAGE_KEY,
  ROUTINE_REMINDER_COMPLETION_STORAGE_KEY,
  ROUTINE_REMINDER_DEVICE_STORAGE_KEY,
] as const;

describe('migration des états utilisateur historiques', () => {
  let database: AppDatabase;

  beforeEach(() => {
    for (const key of legacyStorageKeys) {
      window.localStorage.removeItem(key);
    }
    database = new AppDatabase(
      `sportpilot-user-state-migration-${crypto.randomUUID()}`,
    );
  });

  afterEach(async () => {
    for (const key of legacyStorageKeys) {
      window.localStorage.removeItem(key);
    }
    database.close();
    await database.delete();
  });

  it('copie les objectifs et le planning dans Dexie avant de supprimer les clés', async () => {
    window.localStorage.setItem(
      GOAL_STATE_STORAGE_KEY,
      JSON.stringify(goalState),
    );
    window.localStorage.setItem(
      ENDURANCE_PLANNING_STORAGE_KEY,
      JSON.stringify(planningState),
    );

    await database.open();
    const migrated = await migrateLegacyUserState(database);

    expect(migrated).toMatchObject({
      goals: goalState,
      endurancePlanning: planningState,
      achievements: { earnedAchievements: [] },
      visualThemes: {
        activeThemeId: 'classic',
        unlockedThemeIds: ['classic'],
      },
      weeklyMissions: { completedWeeks: [] },
      routineReminderCompletions: {
        version: 1,
        completions: [],
      },
    });
    expect(await database.goals.toArray()).toEqual(goalState.goals);
    expect(
      await database.endurancePlanningSessions.toArray(),
    ).toEqual(planningState.sessions);
    expect(
      window.localStorage.getItem(GOAL_STATE_STORAGE_KEY),
    ).toBeNull();
    expect(
      window.localStorage.getItem(
        ENDURANCE_PLANNING_STORAGE_KEY,
      ),
    ).toBeNull();
  });

  it('migre les récompenses et sépare les complétions des états appareil', async () => {
    window.localStorage.setItem(
      ACHIEVEMENT_STORAGE_KEY,
      JSON.stringify({
        earnedAchievements: [
          {
            id: 'first-session',
            earnedAt: '2026-06-27T12:00:00.000Z',
          },
        ],
      }),
    );
    window.localStorage.setItem(
      VISUAL_THEME_STORAGE_KEY,
      JSON.stringify({
        activeThemeId: 'power',
        unlockedThemeIds: ['classic', 'power'],
      }),
    );
    window.localStorage.setItem(
      WEEKLY_MISSION_HISTORY_STORAGE_KEY,
      JSON.stringify({
        completedWeeks: [
          {
            weekStart: '2026-06-22',
            completedAt: '2026-06-27T20:00:00.000Z',
          },
        ],
      }),
    );
    window.localStorage.setItem(
      ROUTINE_REMINDER_DEVICE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        days: {
          '2026-06-29': {
            completedAt: {
              weighIn: '2026-06-29T08:30:00.000Z',
            },
            lastShownAt: {
              nutrition: '2026-06-29T09:00:00.000Z',
            },
            snoozedUntil: {
              nutrition: '2026-06-29T10:00:00.000Z',
            },
          },
        },
      }),
    );
    window.localStorage.setItem(
      ROUTINE_REMINDER_COMPLETION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        completions: [
          {
            date: '2026-06-29',
            type: 'weeklyPlanning',
            completedAt: '2026-06-29T11:00:00.000Z',
          },
        ],
      }),
    );

    await database.open();
    const migrated = await migrateLegacyUserState(database);

    expect(migrated.achievements.earnedAchievements).toEqual([
      {
        id: 'first-session',
        earnedAt: '2026-06-27T12:00:00.000Z',
      },
    ]);
    expect(migrated.visualThemes).toEqual({
      activeThemeId: 'power',
      unlockedThemeIds: ['classic', 'power'],
    });
    expect(migrated.weeklyMissions.completedWeeks).toEqual([
      {
        weekStart: '2026-06-22',
        completedAt: '2026-06-27T20:00:00.000Z',
      },
    ]);
    expect(migrated.routineReminderCompletions.completions).toEqual([
      {
        date: '2026-06-29',
        type: 'weeklyPlanning',
        completedAt: '2026-06-29T11:00:00.000Z',
      },
      {
        date: '2026-06-29',
        type: 'weighIn',
        completedAt: '2026-06-29T08:30:00.000Z',
      },
    ]);

    expect(
      await database.earnedAchievements.get('first-session'),
    ).toMatchObject({
      id: 'first-session',
      earnedAt: '2026-06-27T12:00:00.000Z',
    });
    expect(await database.unlockedVisualThemes.count()).toBe(2);
    expect(
      await database.visualThemePreferences.get(
        VISUAL_THEME_PREFERENCE_ID,
      ),
    ).toMatchObject({ activeThemeId: 'power' });
    expect(
      await database.weeklyMissionCompletions.get(
        weeklyMissionCompletionId('2026-06-22'),
      ),
    ).toMatchObject({ weekStart: '2026-06-22' });
    expect(
      await database.routineReminderCompletions.get(
        routineReminderCompletionId('2026-06-29', 'weighIn'),
      ),
    ).toMatchObject({ type: 'weighIn' });

    expect(
      window.localStorage.getItem(ACHIEVEMENT_STORAGE_KEY),
    ).toBeNull();
    expect(
      window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY),
    ).toBeNull();
    expect(
      window.localStorage.getItem(
        WEEKLY_MISSION_HISTORY_STORAGE_KEY,
      ),
    ).toBeNull();
    expect(
      window.localStorage.getItem(
        ROUTINE_REMINDER_COMPLETION_STORAGE_KEY,
      ),
    ).toBeNull();

    const deviceLedger = JSON.parse(
      window.localStorage.getItem(
        ROUTINE_REMINDER_DEVICE_STORAGE_KEY,
      ) ?? '{}',
    ) as Record<string, unknown>;

    expect(JSON.stringify(deviceLedger)).not.toContain('completedAt');
    expect(deviceLedger).toEqual({
      version: 1,
      days: {
        '2026-06-29': {
          lastShownAt: {
            nutrition: '2026-06-29T09:00:00.000Z',
          },
          snoozedUntil: {
            nutrition: '2026-06-29T10:00:00.000Z',
          },
        },
      },
    });
  });

  it('conserve une clé invalide et charge les données Dexie existantes', async () => {
    window.localStorage.setItem(
      GOAL_STATE_STORAGE_KEY,
      '{"version":99}',
    );

    await database.open();
    await database.goals.add(goalState.goals[0]!);

    const migrated = await migrateLegacyUserState(database);

    expect(migrated.goals).toEqual(goalState);
    expect(
      window.localStorage.getItem(GOAL_STATE_STORAGE_KEY),
    ).toBe('{"version":99}');
  });
});
