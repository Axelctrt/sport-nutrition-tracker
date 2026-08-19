import {
  createSyncOrchestratorDomains,
} from '@/application/sync/syncOrchestratorAdapters';
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
