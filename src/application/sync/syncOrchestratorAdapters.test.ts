const activityDirectionals = vi.hoisted(() => ({
  fromCloud: vi.fn(async () => undefined),
  toCloud: vi.fn(async () => undefined),
}));

vi.mock('@/infrastructure/sync-prototype/realActivitySyncService', () => ({
  synchronizeRegisteredRealActivitiesFromCloud: activityDirectionals.fromCloud,
  synchronizeRegisteredRealActivitiesToCloud: activityDirectionals.toCloud,
}));

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

  it('revalide puis route les modes directionnels Activities vers les primitives sûres', async () => {
    activityDirectionals.fromCloud.mockClear();
    activityDirectionals.toCloud.mockClear();
    let origin: 'cloud' | 'local' = 'cloud';
    const analyzeRealActivities = vi.fn(async () => ({
      differingEntityCount: 1,
      changeOrigin: origin,
    }));
    const syncRealActivities = vi.fn(async () => undefined);
    const syncNow = vi.fn(async () => undefined);
    const client = {
      analyzeRealWeights: vi.fn(async () => ({ differingEntityCount: 0 })),
      syncRealWeights: vi.fn(async () => undefined),
      analyzeRealActivities,
      syncRealActivities,
      syncNow,
      getSnapshot: vi.fn(() => ({
        account: { isLoggedIn: true, isLoading: false, userId: 'user-activities' },
        realActivities: {
          enabled: true,
          status: 'ready',
          preview: { differingEntityCount: 1, changeOrigin: origin },
        },
      })),
    } as unknown as SyncPrototypeClient;

    const activities = createSyncOrchestratorDomains(client)
      .find((domain) => domain.id === 'activities');
    expect(activities).toBeDefined();

    await activities!.synchronize('cloud-only');
    expect(syncNow).toHaveBeenCalledTimes(1);
    expect(analyzeRealActivities).toHaveBeenCalledTimes(2);
    expect(activityDirectionals.fromCloud).toHaveBeenCalledWith('user-activities');
    expect(syncRealActivities).not.toHaveBeenCalled();

    origin = 'local';
    analyzeRealActivities.mockClear();
    syncNow.mockClear();
    await activities!.synchronize('local-only');
    expect(activityDirectionals.toCloud).toHaveBeenCalledWith('user-activities');
    expect(syncNow).toHaveBeenCalledTimes(2);
    expect(analyzeRealActivities).toHaveBeenCalledTimes(2);
    expect(syncRealActivities).not.toHaveBeenCalled();
  });

  it('reste sans écriture directionnelle Activities si la provenance fraîche devient unknown', async () => {
    activityDirectionals.fromCloud.mockClear();
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

    expect(activityDirectionals.fromCloud).not.toHaveBeenCalled();
  });
});
