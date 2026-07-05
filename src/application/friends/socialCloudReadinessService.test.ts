import type { CloudFriendRequest } from '@/domain/friends/socialIdentity';
import type { EntityId } from '@/domain/models/common';
import {
  buildSocialCloudReadinessReport,
  unavailableSocialCloudBackend,
} from '@/application/friends/socialCloudReadinessService';

describe('socialCloudReadinessService', () => {
  it('conserve un backend indisponible sans effet distant', async () => {
    await expect(unavailableSocialCloudBackend.identity.readCurrentIdentity('social-user:me' as EntityId)).resolves.toBeUndefined();
    await expect(unavailableSocialCloudBackend.identity.lookupByHandle('@alex.run')).resolves.toEqual({
      status: 'unavailable',
    });
    await expect(unavailableSocialCloudBackend.identity.lookupByHandle('@Alex')).resolves.toEqual({
      status: 'invalidHandle',
    });
    await expect(
      unavailableSocialCloudBackend.friendRequests.sendRequest({
        id: 'request:1',
        requesterUserId: 'social-user:a',
        recipientUserId: 'social-user:b',
        status: 'pending',
        requestedAt: '2026-07-05T10:00:00.000Z',
        createdAt: '2026-07-05T10:00:00.000Z',
        updatedAt: '2026-07-05T10:00:00.000Z',
      } satisfies CloudFriendRequest),
    ).resolves.toMatchObject({
      status: 'unavailable',
    });
    await expect(unavailableSocialCloudBackend.snapshots.listFeedSnapshots('social-user:me' as EntityId)).resolves.toEqual([]);
  });

  it('produit un rapport lisible pour la phase contrat F1', () => {
    expect(
      buildSocialCloudReadinessReport({
        syncPrototypeEnabled: true,
        socialCloudEnabled: false,
        databaseUrl: 'https://sportpilot.dexie.cloud',
      }),
    ).toMatchObject({
      status: 'contractReady',
      canLookupUsers: false,
      lookupFallbackMessage: 'Recherche exacte cloud non branchée : fallback indisponible conservé.',
      mutationFallbackMessage: 'Mutations sociales cloud non branchées : aucune donnée distante n’est écrite.',
    });
  });
});
