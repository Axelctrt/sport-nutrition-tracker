import type { EntityId } from '@/domain/models/common';
import { sendExactFriendRequest } from '@/application/friends/socialFriendRequestService';
import { createFoundSocialUserLookupGateway, unavailableSocialUserLookupGateway } from '@/application/friends/socialIdentityService';
import { DEFAULT_FRIENDS_PRIVACY_SETTINGS, evaluateFriendActivitySharingGuard, type FriendsPrivacySnapshot } from '@/domain/friends/friendship';
import { createDefaultSocialIdentity, type PublicUserProfile } from '@/domain/friends/socialIdentity';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';

const identity = createDefaultSocialIdentity('2026-07-05T10:00:00.000Z', 'alex123');
const profile: PublicUserProfile = {
  userId: 'social-user:lina' as EntityId,
  handle: 'lina.trail',
  displayName: 'Lina Trail',
  createdAt: '2026-07-05T09:00:00.000Z',
  updatedAt: '2026-07-05T09:00:00.000Z',
};
const snapshot: FriendsPrivacySnapshot = {
  friends: [],
  requests: [],
  privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
};

describe('readiness demandes amis réelles 0.27.0 F2', () => {
  it('conserve les versions de stockage publiées sans backend inventé', () => {
    expect(databaseSchemaVersion).toBe(13);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(12);
  });

  it('envoie une demande compatible userId uniquement après recherche exacte trouvée', async () => {
    const result = await sendExactFriendRequest({
      snapshot,
      identity,
      handle: '@lina.trail',
      lookupGateway: createFoundSocialUserLookupGateway([profile]),
    });

    expect(result.status).toBe('sent');
    expect(result.snapshot.requests[0]).toMatchObject({
      requesterUserId: identity.userId,
      recipientUserId: profile.userId,
      handle: profile.handle,
    });
  });

  it('retourne clairement les cas notFound, self et unavailable', async () => {
    await expect(sendExactFriendRequest({
      snapshot,
      identity,
      handle: '@ghost.run',
      lookupGateway: createFoundSocialUserLookupGateway([]),
    })).resolves.toMatchObject({ status: 'notFound' });

    await expect(sendExactFriendRequest({
      snapshot,
      identity,
      handle: '@sp-alex123',
      lookupGateway: createFoundSocialUserLookupGateway([
        {
          userId: identity.userId,
          handle: identity.handle,
          displayName: identity.displayName,
          createdAt: identity.createdAt,
          updatedAt: identity.updatedAt,
        },
      ]),
    })).resolves.toMatchObject({ status: 'self' });

    await expect(sendExactFriendRequest({
      snapshot,
      identity,
      handle: '@lina.trail',
      lookupGateway: unavailableSocialUserLookupGateway,
    })).resolves.toMatchObject({ status: 'unavailable' });
  });

  it('maintient le garde-fou social : aucun détail d’activité exposé', () => {
    const guard = evaluateFriendActivitySharingGuard({
      ...snapshot,
      friends: [
        {
          id: profile.userId as EntityId,
          userId: profile.userId as EntityId,
          displayName: profile.displayName,
          handle: profile.handle,
          initials: 'LT',
        },
      ],
      privacy: {
        ...snapshot.privacy,
        activitySharing: 'detailed',
      },
    });

    expect(guard).toMatchObject({
      allowedScope: 'summary',
      canShareDetailed: false,
      detailedSharingBlocked: true,
    });
  });
});
