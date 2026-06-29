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
