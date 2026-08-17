import { createOrchestratorDomains } from '@/features/settings/components/unifiedSyncDomainRegistry';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createEmptySyncPrototypeDiagnostics } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

function clientWithOrigin(origin: 'local' | 'cloud' | 'both' | 'unknown') {
  const syncRealGoals = vi.fn(async () => undefined);
  const snapshot: SyncPrototypeSnapshot = {
    account: { isLoggedIn: true, isLoading: false, userId: 'user-1' },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realGoals: {
      enabled: true,
      status: 'ready',
      preview: {
        localGoalCount: 1,
        cloudGoalCount: 1,
        localDeletionCount: 0,
        cloudDeletionCount: 0,
        differingEntityCount: 1,
        changeOrigin: origin,
      },
    },
    diagnostics: createEmptySyncPrototypeDiagnostics('user-1'),
  };
  const client = {
    getSnapshot: () => snapshot,
    analyzeRealGoals: vi.fn(async () => snapshot.realGoals!.preview!),
    syncRealGoals,
    analyzeRealWeights: vi.fn(async () => ({ differingEntityCount: 0 })),
    syncRealWeights: vi.fn(async () => undefined),
  } as unknown as SyncPrototypeClient;
  return { client, syncRealGoals };
}

describe('action globale du centre de synchronisation — sécurité Goals', () => {
  it.each(['unknown', 'both'] as const)(
    'Goals %s → action globale → zéro écriture Goals',
    async (origin) => {
      const { client, syncRealGoals } = clientWithOrigin(origin);
      const adapter = createOrchestratorDomains(client)
        .find((candidate) => candidate.id === 'goals');

      expect(adapter).toBeDefined();
      await adapter!.synchronize();

      expect(syncRealGoals).not.toHaveBeenCalled();
    },
  );

  it.each(['local', 'cloud'] as const)(
    'laisse le service Goals traiter une provenance %s démontrée',
    async (origin) => {
      const { client, syncRealGoals } = clientWithOrigin(origin);
      const adapter = createOrchestratorDomains(client)
        .find((candidate) => candidate.id === 'goals');

      await adapter!.synchronize();

      expect(syncRealGoals).toHaveBeenCalledTimes(1);
    },
  );
});
