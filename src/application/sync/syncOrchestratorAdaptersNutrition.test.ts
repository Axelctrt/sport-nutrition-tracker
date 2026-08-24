import {
  createSyncOrchestratorDomains,
} from '@/application/sync/syncOrchestratorAdapters';
import {
  SYNC_LOCAL_DATA_CHANGED_EVENT,
  syncLocalDataChangedDetail,
} from '@/application/sync/syncLocalChangeEvents';
import type { SyncPrototypeClient } from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createEmptySyncPrototypeDiagnostics } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

function client(options: {
  readonly remappedProductReferences?: number;
  readonly recalculatedDailyTargets?: number;
}): SyncPrototypeClient {
  const snapshot = {
    account: {
      isLoggedIn: true,
      isLoading: false,
      userId: 'user-nutrition-adapters',
    },
    sync: { status: 'connected' as const, phase: 'in-sync' as const },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realNutritionLibrary: {
      enabled: true,
      status: 'ready' as const,
      preview: { differingEntityCount: 1 },
    },
    realNutritionTracking: {
      enabled: true,
      status: 'ready' as const,
      preview: { differingEntityCount: 1 },
    },
    diagnostics: createEmptySyncPrototypeDiagnostics(),
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    initialize: async () => undefined,
    syncNow: vi.fn(async () => undefined),
    analyzeRealWeights: vi.fn(async () => ({ differingEntityCount: 0 })),
    syncRealWeights: vi.fn(async () => ({ differingEntityCount: 0 })),
    analyzeRealNutritionLibrary: vi.fn(async () => ({ differingEntityCount: 1 })),
    syncRealNutritionLibrary: vi.fn(async () => ({
      differingEntityCount: 0,
      remappedProductReferences: options.remappedProductReferences ?? 0,
    })),
    analyzeRealNutritionTracking: vi.fn(async () => ({ differingEntityCount: 1 })),
    syncRealNutritionTracking: vi.fn(async () => ({
      differingEntityCount: 0,
      recalculatedDailyTargets: options.recalculatedDailyTargets ?? 0,
    })),
  } as unknown as SyncPrototypeClient;
}

function recordedDetails() {
  const values: Array<ReturnType<typeof syncLocalDataChangedDetail>> = [];
  const listener = (event: Event) => {
    values.push(syncLocalDataChangedDetail(event));
  };
  window.addEventListener(SYNC_LOCAL_DATA_CHANGED_EVENT, listener);
  return {
    values,
    dispose: () => window.removeEventListener(
      SYNC_LOCAL_DATA_CHANGED_EVENT,
      listener,
    ),
  };
}

describe('syncOrchestratorAdapters — dépendances Nutrition', () => {
  it('publie Journal après un remapping durable de références Library', async () => {
    const testClient = client({ remappedProductReferences: 2 });
    const library = createSyncOrchestratorDomains(testClient)
      .find((adapter) => adapter.id === 'nutrition-library');
    const events = recordedDetails();

    try {
      expect(library).toBeDefined();
      await library!.synchronize('bidirectional');

      expect(events.values).toEqual([{
        domainIds: ['nutrition-journal'],
        reason: 'nutrition-library-product-remap',
      }]);
    } finally {
      events.dispose();
    }
  });

  it('publie Journal après un recalcul durable de dailyTargets par Tracking', async () => {
    const testClient = client({ recalculatedDailyTargets: 3 });
    const tracking = createSyncOrchestratorDomains(testClient)
      .find((adapter) => adapter.id === 'nutrition-tracking');
    const events = recordedDetails();

    try {
      expect(tracking).toBeDefined();
      await tracking!.synchronize('bidirectional');

      expect(events.values).toEqual([{
        domainIds: ['nutrition-journal'],
        reason: 'nutrition-tracking-daily-target-recalculation',
      }]);
    } finally {
      events.dispose();
    }
  });

  it('ne publie aucun signal croisé lorsque les compteurs sont à zéro', async () => {
    const testClient = client({
      remappedProductReferences: 0,
      recalculatedDailyTargets: 0,
    });
    const adapters = createSyncOrchestratorDomains(testClient);
    const library = adapters.find((adapter) => adapter.id === 'nutrition-library');
    const tracking = adapters.find((adapter) => adapter.id === 'nutrition-tracking');
    const events = recordedDetails();

    try {
      await library!.synchronize('bidirectional');
      await tracking!.synchronize('bidirectional');
      expect(events.values).toEqual([]);
    } finally {
      events.dispose();
    }
  });

  it.each(['nutrition-library', 'nutrition-tracking'] as const)(
    'refuse les chemins directionnels artificiels pour %s',
    async (domainId) => {
      const testClient = client({});
      const adapter = createSyncOrchestratorDomains(testClient)
        .find((candidate) => candidate.id === domainId);

      await expect(adapter!.synchronize('cloud-only')).rejects.toThrow(
        'cloud-only',
      );
      await expect(adapter!.synchronize('local-only')).rejects.toThrow(
        'local-only',
      );
    },
  );
});
