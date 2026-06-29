import Dexie from 'dexie';

import {
  GOAL_STATE_STORAGE_KEY,
  type GoalState,
} from '@/domain/goals/goalState';
import {
  ENDURANCE_PLANNING_STORAGE_KEY,
  type EndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
import { ROUTINE_REMINDER_DEVICE_STORAGE_KEY } from '@/domain/reminders/routineReminderCompletionState';
import { ACHIEVEMENT_STORAGE_KEY } from '@/domain/rewards/achievements';
import { VISUAL_THEME_STORAGE_KEY } from '@/domain/rewards/visualThemes';
import { WEEKLY_MISSION_HISTORY_STORAGE_KEY } from '@/domain/rewards/weeklyMissionHistory';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import {
  DATABASE_VERSION_4,
  DATABASE_VERSION_7,
} from '@/infrastructure/database/migrations/versions';
import { schemaVersion4 } from '@/infrastructure/database/schema';

const goals: GoalState = {
  version: 1,
  goals: [
    {
      id: 'goal-from-v4',
      title: 'Objectif historique',
      metric: 'weighIns',
      targetValue: 4,
      startDate: '2026-06-01',
      status: 'active',
      reachedMilestones: [],
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-06-01T08:00:00.000Z',
    },
  ],
};

const planning: EndurancePlanningState = {
  version: 1,
  sessions: [
    {
      id: 'plan-from-v4',
      title: 'Séance historique',
      activityType: 'swimming',
      date: '2026-07-03',
      intensity: 'low',
      status: 'planned',
      createdAt: '2026-06-29T08:00:00.000Z',
      updatedAt: '2026-06-29T08:00:00.000Z',
    },
  ],
};

describe('migration v4 vers v7 des états utilisateur', () => {
  it('ajoute les tables et déplace les snapshots localStorage au démarrage', async () => {
    const databaseName =
      `sportpilot-v7-user-state-${crypto.randomUUID()}`;
    const oldDatabase = new Dexie(databaseName);
    let upgradedDatabase: AppDatabase | undefined;

    window.localStorage.setItem(
      GOAL_STATE_STORAGE_KEY,
      JSON.stringify(goals),
    );
    window.localStorage.setItem(
      ENDURANCE_PLANNING_STORAGE_KEY,
      JSON.stringify(planning),
    );
    window.localStorage.setItem(
      ACHIEVEMENT_STORAGE_KEY,
      JSON.stringify({
        earnedAchievements: [
          {
            id: 'first-session',
            earnedAt: '2026-06-29T08:00:00.000Z',
          },
        ],
      }),
    );
    window.localStorage.setItem(
      VISUAL_THEME_STORAGE_KEY,
      JSON.stringify({
        activeThemeId: 'endurance',
        unlockedThemeIds: ['classic', 'endurance'],
      }),
    );
    window.localStorage.setItem(
      WEEKLY_MISSION_HISTORY_STORAGE_KEY,
      JSON.stringify({
        completedWeeks: [
          {
            weekStart: '2026-06-22',
            completedAt: '2026-06-29T09:00:00.000Z',
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
              weighIn: '2026-06-29T10:00:00.000Z',
            },
            lastShownAt: {
              nutrition: '2026-06-29T09:30:00.000Z',
            },
          },
        },
      }),
    );

    try {
      oldDatabase
        .version(DATABASE_VERSION_4)
        .stores(schemaVersion4);
      await oldDatabase.open();
      oldDatabase.close();

      upgradedDatabase = new AppDatabase(databaseName);
      await initializeDatabase(upgradedDatabase);

      expect(upgradedDatabase.verno).toBe(DATABASE_VERSION_7);
      expect(await upgradedDatabase.goals.toArray()).toEqual(
        goals.goals,
      );
      expect(
        await upgradedDatabase.endurancePlanningSessions.toArray(),
      ).toEqual(planning.sessions);
      expect(
        window.localStorage.getItem(GOAL_STATE_STORAGE_KEY),
      ).toBeNull();
      expect(
        window.localStorage.getItem(
          ENDURANCE_PLANNING_STORAGE_KEY,
        ),
      ).toBeNull();
      expect(await upgradedDatabase.earnedAchievements.count()).toBe(1);
      expect(await upgradedDatabase.unlockedVisualThemes.count()).toBe(2);
      expect(await upgradedDatabase.weeklyMissionCompletions.count()).toBe(1);
      expect(await upgradedDatabase.routineReminderCompletions.count()).toBe(1);
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
          ROUTINE_REMINDER_DEVICE_STORAGE_KEY,
        ),
      ).not.toContain('completedAt');
    } finally {
      oldDatabase.close();
      upgradedDatabase?.close();
      await Dexie.delete(databaseName);
      window.localStorage.removeItem(ROUTINE_REMINDER_DEVICE_STORAGE_KEY);
    }
  });
});
