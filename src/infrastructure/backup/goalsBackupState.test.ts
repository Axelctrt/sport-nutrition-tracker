import {
  emptyGoalState,
  GOAL_STATE_STORAGE_KEY,
  writeGoalState,
} from '@/domain/goals/goalState';
import {
  readRewardBackupState,
  restoreRewardBackupState,
} from '@/infrastructure/backup/rewardBackupState';

describe('sauvegarde des objectifs', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('inclut les objectifs dans l’état de sauvegarde', () => {
    writeGoalState({
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
    });

    expect(readRewardBackupState().goals?.goals).toHaveLength(1);
  });

  it('restaure les objectifs présents et préserve les anciens backups', async () => {
    const currentState = {
      version: 1 as const,
      goals: [
        {
          id: 'current',
          title: 'Objectif actuel',
          metric: 'weighIns' as const,
          targetValue: 4,
          startDate: '2026-06-01',
          status: 'active' as const,
          reachedMilestones: [],
          createdAt: '2026-06-01T08:00:00.000Z',
          updatedAt: '2026-06-01T08:00:00.000Z',
        },
      ],
    };

    writeGoalState(currentState);
    const baseState = readRewardBackupState();

    await restoreRewardBackupState({
      achievements: baseState.achievements,
      visualThemes: baseState.visualThemes,
      weeklyMissions: baseState.weeklyMissions,
    });

    expect(
      JSON.parse(
        window.localStorage.getItem(
          GOAL_STATE_STORAGE_KEY,
        ) ?? '{}',
      ),
    ).toEqual(currentState);

    await restoreRewardBackupState({
      ...baseState,
      goals: emptyGoalState(),
    });

    expect(
      JSON.parse(
        window.localStorage.getItem(
          GOAL_STATE_STORAGE_KEY,
        ) ?? '{}',
      ),
    ).toEqual(emptyGoalState());
  });
});
