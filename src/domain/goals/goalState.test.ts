import {
  GOAL_STATE_CHANGED_EVENT,
  GOAL_STATE_STORAGE_KEY,
  emptyGoalState,
  readGoalState,
  writeGoalState,
  type GoalState,
} from '@/domain/goals/goalState';

describe('goalState', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('retourne un état vide si le stockage est absent ou invalide', () => {
    expect(readGoalState()).toEqual(emptyGoalState());

    window.localStorage.setItem(
      GOAL_STATE_STORAGE_KEY,
      '{invalid',
    );

    expect(readGoalState()).toEqual(emptyGoalState());
  });

  it('conserve les objectifs et émet un événement local', () => {
    const listener = vi.fn();
    window.addEventListener(
      GOAL_STATE_CHANGED_EVENT,
      listener,
    );

    const state: GoalState = {
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

    writeGoalState(state);

    expect(readGoalState()).toEqual(state);
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(
      GOAL_STATE_CHANGED_EVENT,
      listener,
    );
  });
});
