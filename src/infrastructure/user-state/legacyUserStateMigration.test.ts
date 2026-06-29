import {
  GOAL_STATE_STORAGE_KEY,
  type GoalState,
} from '@/domain/goals/goalState';
import {
  ENDURANCE_PLANNING_STORAGE_KEY,
  type EndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { migrateLegacyUserState } from '@/infrastructure/user-state/legacyUserStateMigration';

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

describe('migration des états utilisateur historiques', () => {
  let database: AppDatabase;

  beforeEach(() => {
    window.localStorage.clear();
    database = new AppDatabase(
      `sportpilot-user-state-migration-${crypto.randomUUID()}`,
    );
  });

  afterEach(async () => {
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

    expect(migrated).toEqual({
      goals: goalState,
      endurancePlanning: planningState,
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
