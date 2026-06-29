import {
  flushGoalStatePersistence,
  GOAL_STATE_STORAGE_KEY,
  hydrateGoalStateRuntime,
  readGoalState,
  writeGoalState,
  type GoalState,
} from '@/domain/goals/goalState';
import {
  ENDURANCE_PLANNING_STORAGE_KEY,
  flushEndurancePlanningPersistence,
  readEndurancePlanningState,
  writeEndurancePlanningState,
  type EndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
import {
  flushRoutineReminderCompletionPersistence,
  recordRoutineReminderCompletion,
  ROUTINE_REMINDER_COMPLETION_STORAGE_KEY,
} from '@/domain/reminders/routineReminderCompletionState';
import {
  ACHIEVEMENT_STORAGE_KEY,
  flushAchievementStatePersistence,
  unlockAchievements,
} from '@/domain/rewards/achievements';
import {
  VISUAL_THEME_STORAGE_KEY,
  activateVisualTheme,
  flushVisualThemeStatePersistence,
  unlockVisualThemes,
} from '@/domain/rewards/visualThemes';
import {
  WEEKLY_MISSION_HISTORY_STORAGE_KEY,
  flushWeeklyMissionHistoryPersistence,
  recordCompletedWeeklyMission,
} from '@/domain/rewards/weeklyMissionHistory';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';

const goalState: GoalState = {
  version: 1,
  goals: [
    {
      id: 'goal-runtime',
      title: 'Courir',
      metric: 'runningDistanceKm',
      targetValue: 25,
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
      id: 'planning-runtime',
      title: 'Sortie vélo',
      activityType: 'cycling',
      date: '2026-07-04',
      intensity: 'moderate',
      status: 'planned',
      createdAt: '2026-06-29T08:00:00.000Z',
      updatedAt: '2026-06-29T08:00:00.000Z',
    },
  ],
};

describe('runtime des états utilisateur Dexie', () => {
  let database: AppDatabase;

  beforeEach(() => {
    window.localStorage.clear();
    database = new AppDatabase(
      `sportpilot-user-state-runtime-${crypto.randomUUID()}`,
    );
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('met à jour le cache immédiatement puis confirme les écritures dans Dexie', async () => {
    await initializeDatabase(database);

    writeGoalState(goalState);
    writeEndurancePlanningState(planningState);

    expect(readGoalState()).toEqual(goalState);
    expect(readEndurancePlanningState()).toEqual(planningState);

    await Promise.all([
      flushGoalStatePersistence(),
      flushEndurancePlanningPersistence(),
    ]);

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


  it('persiste les récompenses, missions et complétions de rappels dans Dexie', async () => {
    await initializeDatabase(database);

    unlockAchievements(
      ['first-session'],
      '2026-06-29T08:00:00.000Z',
    );
    unlockVisualThemes(['power']);
    activateVisualTheme('power');
    recordCompletedWeeklyMission(
      '2026-06-22',
      '2026-06-29T09:00:00.000Z',
      new Date(2026, 5, 29),
    );
    recordRoutineReminderCompletion(
      '2026-06-29',
      'weighIn',
      '2026-06-29T10:00:00.000Z',
    );

    await Promise.all([
      flushAchievementStatePersistence(),
      flushVisualThemeStatePersistence(),
      flushWeeklyMissionHistoryPersistence(),
      flushRoutineReminderCompletionPersistence(),
    ]);

    expect(
      await database.earnedAchievements.get('first-session'),
    ).toMatchObject({
      earnedAt: '2026-06-29T08:00:00.000Z',
    });
    expect(await database.unlockedVisualThemes.get('power')).toBeDefined();
    expect(
      await database.visualThemePreferences.get(
        'visual-theme-preference',
      ),
    ).toMatchObject({ activeThemeId: 'power' });
    expect(await database.weeklyMissionCompletions.count()).toBe(1);
    expect(await database.routineReminderCompletions.count()).toBe(1);

    expect(window.localStorage.getItem(ACHIEVEMENT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY)).toBeNull();
    expect(
      window.localStorage.getItem(WEEKLY_MISSION_HISTORY_STORAGE_KEY),
    ).toBeNull();
    expect(
      window.localStorage.getItem(
        ROUTINE_REMINDER_COMPLETION_STORAGE_KEY,
      ),
    ).toBeNull();
  });

  it('conserve le snapshot local de secours si Dexie refuse une écriture', async () => {
    hydrateGoalStateRuntime(
      { version: 1, goals: [] },
      async () => {
        throw new Error('écriture refusée');
      },
    );

    writeGoalState(goalState);
    await flushGoalStatePersistence();

    expect(
      JSON.parse(
        window.localStorage.getItem(
          GOAL_STATE_STORAGE_KEY,
        ) ?? '{}',
      ),
    ).toEqual(goalState);
  });
});
