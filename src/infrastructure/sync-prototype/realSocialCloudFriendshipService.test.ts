import type { EntityId } from '@/domain/models/common';
import type { FriendActivityPermission } from '@/domain/friends/friendship';
import type { CloudFriendship } from '@/domain/friends/socialIdentity';
import type { CloudFriendActivityPermissionRecord } from '@/domain/friends/socialCloudFriendship';
import type { SafeSyncPrototypeConfigResult } from '@/infrastructure/sync-prototype/syncPrototypeConfig';
import {
  createRealSocialCloudFriendPermissionPort,
  createRealSocialCloudFriendshipPort,
  createRuntimeSocialCloudFriendPermissionPort,
  createRuntimeSocialCloudFriendshipPort,
  unavailableSocialCloudFriendPermissionPort,
  unavailableSocialCloudFriendshipPort,
  type SocialCloudFriendshipDatabase,
} from '@/infrastructure/sync-prototype/realSocialCloudFriendshipService';

class MemoryTable<T extends { readonly id: string }> {
  readonly values = new Map<string, T>();

  async get(id: string): Promise<T | undefined> {
    return this.values.get(id);
  }

  async put(value: T): Promise<string> {
    this.values.set(value.id, value);
    return value.id;
  }

  where(key: keyof T) {
    return {
      equals: (value: unknown) => ({
        toArray: async () => [...this.values.values()].filter((candidate) => candidate[key] === value),
      }),
    };
  }
}

function createDatabase(): SocialCloudFriendshipDatabase {
  return {
    socialFriendships: new MemoryTable<CloudFriendship>() as never,
    socialFriendPermissions: new MemoryTable<CloudFriendActivityPermissionRecord>() as never,
  };
}

const friendship: CloudFriendship = {
  id: 'cloud-friendship:social-user:alex<->social-user:lina',
  userAId: 'social-user:alex',
  userBId: 'social-user:lina',
  status: 'active',
  createdAt: '2026-07-05T12:30:00.000Z',
  updatedAt: '2026-07-05T12:31:00.000Z',
};

const permission: FriendActivityPermission = {
  id: 'cloud-friend-permission:social-user:alex->social-user:lina' as EntityId,
  friendUserId: 'social-user:lina' as EntityId,
  friendHandle: 'lina.trail',
  sharingLevel: 'summary',
  detailedConsent: 'notRequested',
};

describe('realSocialCloudFriendshipService', () => {
  it('upsert une amitié active stable et la liste pour les deux comptes', async () => {
    const database = createDatabase();
    const port = createRealSocialCloudFriendshipPort(database, {
      now: () => '2026-07-05T12:32:00.000Z',
    });

    const result = await port.upsertFriendship(friendship);

    expect(result.status).toBe('created');
    expect(result.value).toMatchObject({
      id: 'cloud-friendship:social-user:alex<->social-user:lina',
      userAId: 'social-user:alex',
      userBId: 'social-user:lina',
      status: 'active',
      updatedAt: '2026-07-05T12:32:00.000Z',
    });
    await expect(port.listFriendships('social-user:alex' as EntityId)).resolves.toHaveLength(1);
    await expect(port.listFriendships('social-user:lina' as EntityId)).resolves.toHaveLength(1);
  });

  it('refuse une amitié cloud vers soi-même', async () => {
    const port = createRealSocialCloudFriendshipPort(createDatabase());

    const result = await port.upsertFriendship({
      ...friendship,
      userAId: 'social-user:alex',
      userBId: 'social-user:alex',
    });

    expect(result.status).toBe('forbidden');
  });

  it('sauvegarde et relit les permissions cloud par ownerUserId', async () => {
    const database = createDatabase();
    const port = createRealSocialCloudFriendPermissionPort(database, {
      now: () => '2026-07-05T13:00:00.000Z',
    });

    const result = await port.savePermission('social-user:alex' as EntityId, permission);

    expect(result.status).toBe('created');
    await expect(port.listPermissions('social-user:alex' as EntityId)).resolves.toEqual([
      expect.objectContaining({
        friendUserId: 'social-user:lina',
        sharingLevel: 'summary',
        detailedConsent: 'notRequested',
      }),
    ]);
  });

  it('refuse une permission cloud sans friendUserId stable', async () => {
    const port = createRealSocialCloudFriendPermissionPort(createDatabase());

    const result = await port.savePermission('social-user:alex' as EntityId, {
      id: 'friend-activity-permission:lina' as EntityId,
      friendHandle: 'lina.trail',
      sharingLevel: 'summary',
      detailedConsent: 'notRequested',
    });

    expect(result.status).toBe('forbidden');
  });

  it('garde les fallbacks indisponibles sans effet distant', async () => {
    await expect(unavailableSocialCloudFriendshipPort.upsertFriendship(friendship)).resolves.toMatchObject({
      status: 'unavailable',
    });
    await expect(unavailableSocialCloudFriendPermissionPort.savePermission('social-user:alex' as EntityId, permission)).resolves.toMatchObject({
      status: 'unavailable',
    });
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

    const friendshipPort = createRuntimeSocialCloudFriendshipPort({ configResult });
    const permissionPort = createRuntimeSocialCloudFriendPermissionPort({ configResult });

    await expect(friendshipPort.upsertFriendship(friendship)).resolves.toMatchObject({ status: 'unavailable' });
    await expect(permissionPort.savePermission('social-user:alex' as EntityId, permission)).resolves.toMatchObject({ status: 'unavailable' });
  });
});
