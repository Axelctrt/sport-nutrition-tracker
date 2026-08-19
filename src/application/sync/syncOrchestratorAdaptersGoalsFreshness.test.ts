import {
  createSyncOrchestratorDomains,
} from '@/application/sync/syncOrchestratorAdapters';
import {
  hydrateGoalStateRuntime,
  resetGoalStateRuntimeForTests,
  writeGoalState,
} from '@/domain/goals/goalState';
import type { SyncPrototypeClient } from '@/infrastructure/sync-prototype/syncPrototypeClient';

function adapterFor(
  client: SyncPrototypeClient,
  id: 'goals' | 'weights',
) {
  const adapter = createSyncOrchestratorDomains(client)
    .find((candidate) => candidate.id === id);
  if (!adapter) {
    throw new Error(`Adapter ${id} introuvable dans le test.`);
  }
  return adapter;
}

describe('syncOrchestratorAdapters — fraîcheur Goals', () => {
  afterEach(() => {
    resetGoalStateRuntimeForTests();
  });

  it('attend la persistance Goals avant la barrière transport', async () => {
    let releasePersistence: () => void = () => undefined;
    const persistenceGate = new Promise<void>((resolve) => {
      releasePersistence = () => resolve();
    });
    let markPersistenceStarted: () => void = () => undefined;
    const persistenceStarted = new Promise<void>((resolve) => {
      markPersistenceStarted = () => resolve();
    });

    hydrateGoalStateRuntime(
      { version: 1, goals: [] },
      async () => {
        markPersistenceStarted();
        await persistenceGate;
      },
    );
    writeGoalState({ version: 1, goals: [] });
    await persistenceStarted;

    const client = {
      syncNow: vi.fn(async () => undefined),
      analyzeRealWeights: vi.fn(async () => ({
        differingEntityCount: 0,
      })),
      syncRealWeights: vi.fn(async () => ({})),
      analyzeRealGoals: vi.fn(async () => ({
        differingEntityCount: 0,
      })),
      syncRealGoals: vi.fn(async () => ({})),
    } as unknown as SyncPrototypeClient;

    const analyzePromise = adapterFor(client, 'goals').analyze();
    await Promise.resolve();

    expect(client.syncNow).not.toHaveBeenCalled();

    releasePersistence();
    await analyzePromise;

    expect(client.syncNow).toHaveBeenCalledTimes(1);
    expect(client.analyzeRealGoals).toHaveBeenCalledTimes(1);
  });

  it('pose une barrière transport supplémentaire avant analyse et sync Goals', async () => {
    const calls: string[] = [];
    const client = {
      syncNow: vi.fn(async () => {
        calls.push('transport-barrier');
      }),
      analyzeRealWeights: vi.fn(async () => ({
        differingEntityCount: 0,
      })),
      syncRealWeights: vi.fn(async () => ({})),
      analyzeRealGoals: vi.fn(async () => {
        calls.push('goals-analyze');
        return { differingEntityCount: 0 };
      }),
      syncRealGoals: vi.fn(async () => {
        calls.push('goals-sync');
        return {};
      }),
    } as unknown as SyncPrototypeClient;

    const goals = adapterFor(client, 'goals');

    await goals.analyze();
    expect(calls).toEqual([
      'transport-barrier',
      'goals-analyze',
    ]);

    calls.length = 0;
    await goals.synchronize();
    expect(calls).toEqual([
      'transport-barrier',
      'goals-sync',
    ]);
  });

  it('ne double pas la barrière transport des autres domaines', async () => {
    const client = {
      syncNow: vi.fn(async () => undefined),
      analyzeRealWeights: vi.fn(async () => ({
        differingEntityCount: 0,
      })),
      syncRealWeights: vi.fn(async () => ({})),
    } as unknown as SyncPrototypeClient;

    await adapterFor(client, 'weights').analyze();

    expect(client.syncNow).not.toHaveBeenCalled();
    expect(client.analyzeRealWeights).toHaveBeenCalledTimes(1);
  });
});
