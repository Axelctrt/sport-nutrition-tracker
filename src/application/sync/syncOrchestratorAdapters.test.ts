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

  it('refuse les modes directionnels pour un domaine encore sans primitive sûre', async () => {
    const client = {
      analyzeRealWeights: vi.fn(async () => ({ differingEntityCount: 0 })),
      syncRealWeights: vi.fn(async () => undefined),
      analyzeRealActivities: vi.fn(async () => ({ differingEntityCount: 1 })),
      syncRealActivities: vi.fn(async () => undefined),
      getSnapshot: vi.fn(() => ({})),
    } as unknown as SyncPrototypeClient;

    const activities = createSyncOrchestratorDomains(client)
      .find((domain) => domain.id === 'activities');

    expect(activities).toBeDefined();
    await expect(activities!.synchronize('cloud-only')).rejects.toThrow(
      'La convergence cloud-only n’est pas disponible pour activities.',
    );
    await expect(activities!.synchronize('local-only')).rejects.toThrow(
      'L’envoi local-only n’est pas disponible pour activities.',
    );
  });
});
