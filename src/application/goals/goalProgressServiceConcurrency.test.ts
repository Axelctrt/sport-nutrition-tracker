import type { BackupData } from '@/domain/models/backup';
import {
  readGoalState,
  resetGoalStateRuntimeForTests,
  writeGoalState,
  type Goal,
} from '@/domain/goals/goalState';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';

const readBackupData = vi.hoisted(() => vi.fn());

vi.mock('@/infrastructure/backup/backupService', () => ({
  readBackupData,
}));

import { refreshGoalProgress } from '@/application/goals/goalProgressService';

function goal(targetValue: number, updatedAt: string): Goal {
  return {
    id: 'goal-concurrent-refresh',
    title: 'Objectif concurrent',
    metric: 'totalSteps',
    targetValue,
    startDate: '2026-08-01',
    status: 'active',
    reachedMilestones: [],
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt,
  };
}

function progressData(): BackupData {
  return {
    userProfile: [],
    appSettings: [],
    weights: [],
    dailySteps: [
      {
        id: 'steps-concurrent-refresh',
        date: '2026-08-19',
        totalSteps: 5_000,
        source: 'manual',
        createdAt: '2026-08-19T08:00:00.000Z',
        updatedAt: '2026-08-19T08:00:00.000Z',
      },
    ],
    activities: [],
    foodProducts: [],
    meals: [],
    foodEntries: [],
    favoriteMeals: [],
    recipes: [],
    recipeIngredients: [],
    dailyTargets: [],
    dailyJournalStatuses: [],
    weeklyReviews: [],
    acceptedCalorieAdjustments: [],
    exerciseDefinitions: [],
    workoutTemplates: [],
    workoutTemplateExercises: [],
    workoutSessions: [],
    workoutSessionExercises: [],
    strengthSets: [],
    progressionSuggestions: [],
  };
}

describe('goalProgressService — refresh concurrent', () => {
  beforeEach(() => {
    resetGoalStateRuntimeForTests();
    window.localStorage.clear();
    readBackupData.mockReset();
  });

  afterEach(() => {
    resetGoalStateRuntimeForTests();
    window.localStorage.clear();
  });

  it('ne réécrit pas un ancien objectif si l’utilisateur le modifie pendant la lecture des données de progression', async () => {
    writeGoalState({
      version: 1,
      goals: [goal(10_000, '2026-08-19T19:00:00.000Z')],
    });

    let releaseData: () => void = () => undefined;
    const dataGate = new Promise<void>((resolve) => {
      releaseData = resolve;
    });
    let markReadStarted: () => void = () => undefined;
    const readStarted = new Promise<void>((resolve) => {
      markReadStarted = resolve;
    });

    readBackupData.mockImplementationOnce(async () => {
      markReadStarted();
      await dataGate;
      return progressData();
    });

    const refreshPromise = refreshGoalProgress({} as AppDatabase);
    await readStarted;

    writeGoalState({
      version: 1,
      goals: [goal(55_000, '2026-08-19T19:01:00.000Z')],
    });

    releaseData();
    const views = await refreshPromise;

    expect(readGoalState().goals[0]).toMatchObject({
      targetValue: 55_000,
      updatedAt: '2026-08-19T19:01:00.000Z',
    });
    expect(views[0]?.goal).toMatchObject({
      targetValue: 55_000,
    });
  });
});
