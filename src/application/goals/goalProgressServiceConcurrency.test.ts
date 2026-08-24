import {
  readGoalState,
  resetGoalStateRuntimeForTests,
  writeGoalState,
  type Goal,
} from '@/domain/goals/goalState';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
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

function createDelayedBackupDatabase(
  onReadStarted: () => void,
  waitForRelease: Promise<void>,
): AppDatabase {
  const emptyTable = {
    toArray: vi.fn(async () => []),
  };
  const dailyStepsTable = {
    toArray: vi.fn(async () => [
      {
        id: 'steps-concurrent-refresh',
        date: '2026-08-19',
        totalSteps: 5_000,
        source: 'manual',
        createdAt: '2026-08-19T08:00:00.000Z',
        updatedAt: '2026-08-19T08:00:00.000Z',
      },
    ]),
  };
  const transaction = vi.fn(
    async (
      _mode: unknown,
      _tables: unknown,
      scope: () => Promise<unknown>,
    ) => {
      onReadStarted();
      await waitForRelease;
      return scope();
    },
  );

  return new Proxy(
    { transaction },
    {
      get(target, property) {
        if (property === 'transaction') return target.transaction;
        if (property === 'dailySteps') return dailyStepsTable;
        return emptyTable;
      },
    },
  ) as unknown as AppDatabase;
}

describe('goalProgressService — refresh concurrent', () => {
  beforeEach(() => {
    resetGoalStateRuntimeForTests();
    window.localStorage.clear();
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
      releaseData = () => resolve();
    });
    let markReadStarted: () => void = () => undefined;
    const readStarted = new Promise<void>((resolve) => {
      markReadStarted = () => resolve();
    });
    const database = createDelayedBackupDatabase(
      markReadStarted,
      dataGate,
    );

    const refreshPromise = refreshGoalProgress(database);
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
