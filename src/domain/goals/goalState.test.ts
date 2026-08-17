import {
  flushGoalStatePersistence,
  GOAL_STATE_CHANGED_EVENT,
  GOAL_STATE_PERSISTED_EVENT,
  GOAL_STATE_STORAGE_KEY,
  emptyGoalState,
  hydrateGoalStateRuntime,
  readGoalState,
  resetGoalStateRuntimeForTests,
  writeGoalState,
  type GoalState,
} from '@/domain/goals/goalState';

function state(): GoalState {
  return {
    version: 1,
    goals: [
      {
        id: 'goal-1',
        title: 'Courir 50 km',
        metric: 'runningDistanceKm',
        targetValue: 50,
        startDate: '2026-06-01',
        status: 'active',
        reachedMilestones: [25],
        createdAt: '2026-06-01T10:00:00.000Z',
        updatedAt: '2026-06-01T10:00:00.000Z',
      },
    ],
  };
}

describe('goalState', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetGoalStateRuntimeForTests();
  });

  afterEach(() => {
    resetGoalStateRuntimeForTests();
    vi.restoreAllMocks();
  });

  it('retourne un état vide si le stockage est absent ou invalide', () => {
    expect(readGoalState()).toEqual(emptyGoalState());

    window.localStorage.setItem(
      GOAL_STATE_STORAGE_KEY,
      '{invalid',
    );

    expect(readGoalState()).toEqual(emptyGoalState());
  });

  it('conserve le signal changed immédiat sans prétendre à une persistance AppDatabase', () => {
    const changed = vi.fn();
    const persisted = vi.fn();
    window.addEventListener(GOAL_STATE_CHANGED_EVENT, changed);
    window.addEventListener(GOAL_STATE_PERSISTED_EVENT, persisted);

    const value = state();
    writeGoalState(value);

    expect(readGoalState()).toEqual(value);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(persisted).not.toHaveBeenCalled();

    window.removeEventListener(GOAL_STATE_CHANGED_EVENT, changed);
    window.removeEventListener(GOAL_STATE_PERSISTED_EVENT, persisted);
  });

  it('émet persisted uniquement après la réussite de la persistance AppDatabase', async () => {
    let resolvePersistence: (() => void) | undefined;
    const persist = vi.fn(
      () => new Promise<void>((resolve) => {
        resolvePersistence = resolve;
      }),
    );
    hydrateGoalStateRuntime(emptyGoalState(), persist);
    const changed = vi.fn();
    const persisted = vi.fn();
    window.addEventListener(GOAL_STATE_CHANGED_EVENT, changed);
    window.addEventListener(GOAL_STATE_PERSISTED_EVENT, persisted);

    writeGoalState(state());

    expect(changed).toHaveBeenCalledTimes(1);
    expect(persisted).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    expect(persisted).not.toHaveBeenCalled();

    resolvePersistence?.();
    await flushGoalStatePersistence();

    expect(persisted).toHaveBeenCalledTimes(1);
    window.removeEventListener(GOAL_STATE_CHANGED_EVENT, changed);
    window.removeEventListener(GOAL_STATE_PERSISTED_EVENT, persisted);
  });

  it('n’émet jamais persisted lorsque la persistance AppDatabase échoue', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    hydrateGoalStateRuntime(
      emptyGoalState(),
      vi.fn(async () => {
        throw new Error('Dexie indisponible');
      }),
    );
    const persisted = vi.fn();
    window.addEventListener(GOAL_STATE_PERSISTED_EVENT, persisted);

    writeGoalState(state());
    await flushGoalStatePersistence();

    expect(persisted).not.toHaveBeenCalled();
    window.removeEventListener(GOAL_STATE_PERSISTED_EVENT, persisted);
  });
});
