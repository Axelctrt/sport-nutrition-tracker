import adapterSource from '@/application/sync/syncOrchestratorAdapters.ts?raw';
import {
  createSyncOrchestratorDomains,
} from '@/application/sync/syncOrchestratorAdapters';
import type { SyncPrototypeClient } from '@/infrastructure/sync-prototype/syncPrototypeClient';

describe('syncOrchestratorAdapters', () => {
  it('route cloud-only et local-only vers les primitives Strength dédiées', async () => {
    const analyzeRealStrength = vi.fn(async () => ({ differingEntityCount: 1 }));
    const syncRealStrength = vi.fn(async () => undefined);
    const syncRealStrengthFromCloud = vi.fn(async () => undefined);
    const syncRealStrengthToCloud = vi.fn(async () => undefined);
    const client = {
      analyzeRealWeights: vi.fn(async () => ({ differingEntityCount: 0 })),
      syncRealWeights: vi.fn(async () => undefined),
      analyzeRealStrength,
      syncRealStrength,
      syncRealStrengthFromCloud,
      syncRealStrengthToCloud,
      getSnapshot: vi.fn(() => ({
        realStrength: {
          enabled: true,
          status: 'ready',
          preview: { differingEntityCount: 1, changeOrigin: 'cloud' },
        },
      })),
    } as unknown as SyncPrototypeClient;

    const strength = createSyncOrchestratorDomains(client)
      .find((domain) => domain.id === 'strength');
    expect(strength).toBeDefined();

    await strength!.synchronize('cloud-only');
    expect(syncRealStrengthFromCloud).toHaveBeenCalledTimes(1);
    expect(syncRealStrength).not.toHaveBeenCalled();

    await strength!.synchronize('local-only');
    expect(syncRealStrengthToCloud).toHaveBeenCalledTimes(1);
    expect(syncRealStrength).not.toHaveBeenCalled();

    await strength!.synchronize();
    expect(syncRealStrength).toHaveBeenCalledTimes(1);
  });

  it('câble Activities vers les primitives enregistrées sûres avec revalidation fraîche', () => {
    expect(adapterSource).toContain(
      'synchronizeRegisteredRealActivitiesFromCloud',
    );
    expect(adapterSource).toContain(
      'synchronizeRegisteredRealActivitiesToCloud',
    );
    expect(adapterSource).toContain(
      "synchronizeRegisteredDirection(\n          client,\n          'activities',\n          'cloud'",
    );
    expect(adapterSource).toContain(
      "synchronizeRegisteredDirection(\n          client,\n          'activities',\n          'local'",
    );
    expect(adapterSource).toContain('await client.syncNow();');
    expect(adapterSource).toContain('await analyze();');
  });

  it('reste sans écriture directionnelle Activities si la provenance fraîche devient unknown', async () => {
    let analysisCount = 0;
    const client = {
      analyzeRealWeights: vi.fn(async () => ({ differingEntityCount: 0 })),
      syncRealWeights: vi.fn(async () => undefined),
      analyzeRealActivities: vi.fn(async () => {
        analysisCount += 1;
        return { differingEntityCount: 1, changeOrigin: 'unknown' };
      }),
      syncRealActivities: vi.fn(async () => undefined),
      syncNow: vi.fn(async () => undefined),
      getSnapshot: vi.fn(() => ({
        account: { isLoggedIn: true, isLoading: false, userId: 'user-activities' },
        realActivities: {
          enabled: true,
          status: 'ready',
          preview: {
            differingEntityCount: 1,
            changeOrigin: analysisCount === 0 ? 'cloud' : 'unknown',
          },
        },
      })),
    } as unknown as SyncPrototypeClient;

    const activities = createSyncOrchestratorDomains(client)
      .find((domain) => domain.id === 'activities')!;
    await activities.synchronize('cloud-only');

    expect(client.syncNow).toHaveBeenCalledTimes(1);
    expect(client.analyzeRealActivities).toHaveBeenCalledTimes(1);
    expect(client.syncRealActivities).not.toHaveBeenCalled();
  });
});
