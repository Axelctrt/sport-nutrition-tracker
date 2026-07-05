import type { EntityId } from '@/domain/models/common';
import type { CloudFriendRequest } from '@/domain/friends/socialIdentity';
import {
  createRealSocialCloudFriendRequestPort,
  createRuntimeSocialCloudFriendRequestPort,
  unavailableSocialCloudFriendRequestPort,
  type SocialCloudFriendRequestDatabase,
} from '@/infrastructure/sync-prototype/realSocialCloudFriendRequestService';

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

function createDatabase(): SocialCloudFriendRequestDatabase {
  return {
    socialFriendRequests: new MemoryTable<CloudFriendRequest>() as never,
  };
}

const baseRequest: CloudFriendRequest = {
  id: 'friend-request:social-user:alex->social-user:lina',
  requesterUserId: 'social-user:alex',
  recipientUserId: 'social-user:lina',
  status: 'pending',
  requestedAt: '2026-07-05T12:00:00.000Z',
  createdAt: '2026-07-05T12:00:00.000Z',
  updatedAt: '2026-07-05T12:00:00.000Z',
};

describe('realSocialCloudFriendRequestService', () => {
  it('envoie une demande cloud unique basée sur requesterUserId et recipientUserId', async () => {
    const database = createDatabase();
    const port = createRealSocialCloudFriendRequestPort(database, {
      now: () => '2026-07-05T13:00:00.000Z',
    });

    const result = await port.sendRequest(baseRequest);

    expect(result.status).toBe('created');
    expect(result.value).toMatchObject({
      id: 'friend-request:social-user:alex->social-user:lina',
      requesterUserId: 'social-user:alex',
      recipientUserId: 'social-user:lina',
      status: 'pending',
    });
  });

  it('bloque les doublons pending sans créer d’amitié automatique', async () => {
    const database = createDatabase();
    const port = createRealSocialCloudFriendRequestPort(database);

    await port.sendRequest(baseRequest);
    const duplicate = await port.sendRequest(baseRequest);

    expect(duplicate.status).toBe('alreadyExists');
    expect(duplicate.message).toContain('déjà en attente');
  });

  it('liste les demandes entrantes et sortantes par userId', async () => {
    const database = createDatabase();
    const port = createRealSocialCloudFriendRequestPort(database);
    await port.sendRequest(baseRequest);

    await port.sendRequest({
      ...baseRequest,
      id: 'friend-request:social-user:nora->social-user:alex',
      requesterUserId: 'social-user:nora',
      recipientUserId: 'social-user:alex',
    });

    const incoming = await port.listIncomingRequests('social-user:alex' as EntityId);
    const outgoing = await port.listOutgoingRequests('social-user:alex' as EntityId);

    expect(incoming).toHaveLength(1);
    expect(incoming[0]?.requesterUserId).toBe('social-user:nora');
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0]?.recipientUserId).toBe('social-user:lina');
  });

  it('met à jour le statut sans créer la relation ami', async () => {
    const database = createDatabase();
    const port = createRealSocialCloudFriendRequestPort(database);
    await port.sendRequest(baseRequest);

    const result = await port.updateRequestStatus(
      baseRequest.id,
      'accepted',
      '2026-07-05T14:00:00.000Z',
    );

    expect(result.status).toBe('updated');
    expect(result.value).toMatchObject({
      status: 'accepted',
      respondedAt: '2026-07-05T14:00:00.000Z',
    });
  });

  it('refuse une demande vers soi-même', async () => {
    const database = createDatabase();
    const port = createRealSocialCloudFriendRequestPort(database);

    const result = await port.sendRequest({
      ...baseRequest,
      requesterUserId: 'social-user:alex',
      recipientUserId: 'social-user:alex',
    });

    expect(result.status).toBe('forbidden');
  });

  it('retourne unavailable via le fallback explicite', async () => {
    const result = await unavailableSocialCloudFriendRequestPort.sendRequest(baseRequest);

    expect(result.status).toBe('unavailable');
    expect(result.message).toContain('indisponible');
  });

  it('garde le runtime indisponible quand le flag cloud social réel est désactivé', async () => {
    const port = createRuntimeSocialCloudFriendRequestPort({
      configResult: {
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
      },
    });

    await expect(port.sendRequest(baseRequest)).resolves.toMatchObject({ status: 'unavailable' });
  });
});
