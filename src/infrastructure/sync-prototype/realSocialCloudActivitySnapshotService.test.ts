import type { EntityId } from '@/domain/models/common';
import type { SocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshot';
import type { CloudSocialActivitySnapshotRecord } from '@/domain/friends/socialCloudActivitySnapshot';
import type { SafeSyncPrototypeConfigResult } from '@/infrastructure/sync-prototype/syncPrototypeConfig';
import {
  createRealSocialCloudActivitySnapshotPort,
  createRuntimeSocialCloudActivitySnapshotPort,
  unavailableSocialCloudActivitySnapshotPort,
  type SocialCloudActivitySnapshotDatabase,
} from '@/infrastructure/sync-prototype/realSocialCloudActivitySnapshotService';

class MemoryTable<T extends { readonly id: string }> {
  readonly values = new Map<string, T>();

  async bulkPut(values: readonly T[]): Promise<string> {
    for (const value of values) this.values.set(value.id, value);
    return values.at(-1)?.id ?? '';
  }

  where(key: keyof T) {
    return {
      equals: (value: unknown) => ({
        toArray: async () => [...this.values.values()].filter((candidate) => candidate[key] === value),
      }),
    };
  }
}

function createDatabase(): SocialCloudActivitySnapshotDatabase {
  return {
    socialActivitySnapshots: new MemoryTable<CloudSocialActivitySnapshotRecord>() as never,
  };
}

const snapshot: SocialActivitySnapshot = {
  id: 'social-activity-snapshot:activity:run-1:friend:social-user:lina:summary' as EntityId,
  sourceActivityId: 'activity:run-1' as EntityId,
  friendId: 'social-user:lina' as EntityId,
  friendHandle: 'lina.trail',
  scope: 'summary',
  activityType: 'running',
  date: '2026-07-05',
  durationMinutes: 42,
  intensity: 'moderate',
  estimatedCaloriesKcal: 420,
  metrics: { distanceKm: 8.2 },
  createdAt: '2026-07-05T08:00:00.000Z',
  guardReason: 'Résumé filtré autorisé.',
};

describe('realSocialCloudActivitySnapshotService', () => {
  it('publie et relit des snapshots filtrés pour le feed distant', async () => {
    const database = createDatabase();
    const port = createRealSocialCloudActivitySnapshotPort(database, {
      now: () => '2026-07-05T09:00:00.000Z',
    });

    const result = await port.publishSnapshots('social-user:alex' as EntityId, [snapshot]);

    expect(result.status).toBe('created');
    const feedSnapshots = await port.listFeedSnapshots('social-user:lina' as EntityId);
    expect(feedSnapshots).toEqual([
      expect.objectContaining({
        id: snapshot.id,
        friendId: 'social-user:alex',
        scope: 'summary',
      }),
    ]);
  });

  it('refuse un snapshot qui transporterait une donnée brute', async () => {
    const port = createRealSocialCloudActivitySnapshotPort(createDatabase());

    const result = await port.publishSnapshots('social-user:alex' as EntityId, [
      { ...snapshot, rawActivity: { id: 'activity:run-1' } } as unknown as SocialActivitySnapshot,
    ]);

    expect(result.status).toBe('unavailable');
    expect(result.message).toContain('rawActivity');
  });

  it('garde le fallback indisponible sans effet distant', async () => {
    await expect(unavailableSocialCloudActivitySnapshotPort.publishSnapshots('social-user:alex' as EntityId, [snapshot])).resolves.toMatchObject({
      status: 'unavailable',
    });
    await expect(unavailableSocialCloudActivitySnapshotPort.listFeedSnapshots('social-user:lina' as EntityId)).resolves.toEqual([]);
  });

  it('garde le runtime indisponible quand le flag cloud social réel est désactivé', async () => {
    const configResult: SafeSyncPrototypeConfigResult = {
      config: {
        enabled: true,
        databaseUrl: 'https://sportpilot-prototype.dexie.cloud',
        realWeightSyncEnabled: true,
        realActivitySyncEnabled: true,
        realGoalSyncEnabled: true,
        realStrengthSyncEnabled: true,
        realNutritionJournalSyncEnabled: true,
        realNutritionLibrarySyncEnabled: true,
        realNutritionTrackingSyncEnabled: true,
        realAccountPreferencesSyncEnabled: true,
        realRewardsRoutinesSyncEnabled: true,
        realSocialCloudEnabled: false,
        diagnosticsEnabled: true,
      },
    };

    const port = createRuntimeSocialCloudActivitySnapshotPort({ configResult });

    await expect(port.publishSnapshots('social-user:alex' as EntityId, [snapshot])).resolves.toMatchObject({ status: 'unavailable' });
    await expect(port.listFeedSnapshots('social-user:lina' as EntityId)).resolves.toEqual([]);
  });
});
