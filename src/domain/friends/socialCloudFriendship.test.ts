import type { EntityId } from '@/domain/models/common';
import {
  assertSocialCloudFriendshipContractIntegrity,
  buildCloudFriendActivityPermissionRecord,
  buildCloudFriendshipFromAcceptedRequest,
  cloudPermissionRecordToLocalPermission,
  createCloudFriendActivityPermissionId,
  createCloudFriendshipId,
  mergeCloudFriendPermissionsIntoSnapshot,
  mergeCloudFriendshipsIntoSnapshot,
  normalizeCloudFriendshipForUser,
} from '@/domain/friends/socialCloudFriendship';
import { DEFAULT_FRIENDS_PRIVACY_SETTINGS, type FriendsPrivacySnapshot } from '@/domain/friends/friendship';
import type { CloudFriendRequest, PublicUserProfile } from '@/domain/friends/socialIdentity';

const acceptedRequest: CloudFriendRequest = {
  id: 'friend-request:social-user:alex->social-user:lina',
  requesterUserId: 'social-user:alex',
  recipientUserId: 'social-user:lina',
  status: 'accepted',
  requestedAt: '2026-07-05T12:00:00.000Z',
  respondedAt: '2026-07-05T12:30:00.000Z',
  createdAt: '2026-07-05T12:00:00.000Z',
  updatedAt: '2026-07-05T12:30:00.000Z',
};

const profile: PublicUserProfile = {
  userId: 'social-user:lina' as EntityId,
  handle: 'lina.trail',
  displayName: 'Lina Trail',
  createdAt: '2026-07-05T09:00:00.000Z',
  updatedAt: '2026-07-05T09:00:00.000Z',
};

const emptySnapshot: FriendsPrivacySnapshot = {
  friends: [],
  requests: [],
  privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
};

describe('socialCloudFriendship', () => {
  it('crée une amitié cloud stable uniquement après acceptation explicite', () => {
    const friendship = buildCloudFriendshipFromAcceptedRequest(acceptedRequest, '2026-07-05T12:31:00.000Z');

    expect(friendship).toEqual({
      id: 'cloud-friendship:social-user:alex<->social-user:lina',
      userAId: 'social-user:alex',
      userBId: 'social-user:lina',
      status: 'active',
      createdAt: '2026-07-05T12:30:00.000Z',
      updatedAt: '2026-07-05T12:31:00.000Z',
    });
    expect(createCloudFriendshipId('social-user:lina' as EntityId, 'social-user:alex' as EntityId)).toBe(friendship.id);
  });

  it('refuse de créer une amitié depuis une demande non acceptée', () => {
    expect(() => buildCloudFriendshipFromAcceptedRequest({
      ...acceptedRequest,
      status: 'pending',
    })).toThrow('acceptation explicite');
  });

  it('normalise la relation pour le compte courant sans handle comme clé', () => {
    const friendship = buildCloudFriendshipFromAcceptedRequest(acceptedRequest);

    expect(normalizeCloudFriendshipForUser(friendship, 'social-user:alex' as EntityId)).toMatchObject({
      friendUserId: 'social-user:lina',
      relationshipKey: 'userId',
      defaultPermissionLevel: 'summary',
      detailedRequiresConsent: true,
      exposesRawActivity: false,
    });
    expect(normalizeCloudFriendshipForUser(friendship, 'social-user:other' as EntityId)).toBeUndefined();
  });

  it('fusionne les amitiés cloud dans le snapshot local avec permission résumé par défaut', () => {
    const friendship = buildCloudFriendshipFromAcceptedRequest(acceptedRequest);
    const merged = mergeCloudFriendshipsIntoSnapshot(
      emptySnapshot,
      'social-user:alex' as EntityId,
      [friendship],
      [profile],
    );

    expect(merged.friends).toEqual([
      expect.objectContaining({
        userId: profile.userId,
        handle: 'lina.trail',
        displayName: 'Lina Trail',
      }),
    ]);
    expect(merged.activityPermissions).toEqual([
      expect.objectContaining({
        friendUserId: profile.userId,
        sharingLevel: 'summary',
        detailedConsent: 'notRequested',
      }),
    ]);
  });

  it('synchronise une permission détaillée uniquement avec consentement explicite', () => {
    const friend = {
      id: profile.userId as EntityId,
      userId: profile.userId as EntityId,
      displayName: profile.displayName,
      handle: profile.handle,
      initials: 'LT',
    };
    const record = buildCloudFriendActivityPermissionRecord(
      'social-user:alex' as EntityId,
      friend,
      {
        id: createCloudFriendActivityPermissionId('social-user:alex' as EntityId, profile.userId as EntityId),
        friendUserId: profile.userId as EntityId,
        friendHandle: profile.handle,
        sharingLevel: 'detailed',
        detailedConsent: 'granted',
        detailedConsentGrantedAt: '2026-07-05T13:00:00.000Z',
      },
      '2026-07-05T13:01:00.000Z',
    );

    expect(record).toMatchObject({
      ownerUserId: 'social-user:alex',
      friendUserId: profile.userId,
      sharingLevel: 'detailed',
      detailedConsent: 'granted',
      detailedConsentGrantedAt: '2026-07-05T13:00:00.000Z',
    });
    expect(cloudPermissionRecordToLocalPermission(record)).toMatchObject({
      friendUserId: profile.userId,
      sharingLevel: 'detailed',
      detailedConsent: 'granted',
    });
  });

  it('fusionne les permissions cloud sans exposer d’activité brute', () => {
    const friend = {
      id: profile.userId as EntityId,
      userId: profile.userId as EntityId,
      displayName: profile.displayName,
      handle: profile.handle,
      initials: 'LT',
    };
    const record = buildCloudFriendActivityPermissionRecord('social-user:alex' as EntityId, friend, undefined, '2026-07-05T13:01:00.000Z');
    const merged = mergeCloudFriendPermissionsIntoSnapshot({ ...emptySnapshot, friends: [friend] }, [record]);

    expect(merged.activityPermissions).toEqual([
      expect.objectContaining({
        friendUserId: profile.userId,
        sharingLevel: 'summary',
        detailedConsent: 'notRequested',
      }),
    ]);
  });

  it('valide l’intégrité du contrat F5', () => {
    expect(assertSocialCloudFriendshipContractIntegrity()).toBe(true);
  });
});
