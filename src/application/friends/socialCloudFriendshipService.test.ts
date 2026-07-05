import type { EntityId } from '@/domain/models/common';
import { syncAcceptedCloudFriendship } from '@/application/friends/socialCloudFriendshipService';
import { DEFAULT_FRIENDS_PRIVACY_SETTINGS, type FriendsPrivacySnapshot } from '@/domain/friends/friendship';
import type { CloudFriendRequest, CloudFriendship, PublicUserProfile } from '@/domain/friends/socialIdentity';
import type { FriendActivityPermission } from '@/domain/friends/friendship';
import type { SocialCloudFriendPermissionPort, SocialCloudFriendshipPort } from '@/domain/friends/socialCloudContract';

const request: CloudFriendRequest = {
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

const snapshot: FriendsPrivacySnapshot = {
  friends: [],
  requests: [],
  privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
};

function createPorts(): {
  readonly friendships: CloudFriendship[];
  readonly permissions: FriendActivityPermission[];
  readonly friendshipPort: SocialCloudFriendshipPort;
  readonly permissionPort: SocialCloudFriendPermissionPort;
} {
  const friendships: CloudFriendship[] = [];
  const permissions: FriendActivityPermission[] = [];

  return {
    friendships,
    permissions,
    friendshipPort: {
      async listFriendships() {
        return friendships;
      },
      async upsertFriendship(friendship) {
        friendships.push(friendship);
        return {
          status: 'created',
          value: friendship,
          message: 'Amitié cloud créée.',
        };
      },
    },
    permissionPort: {
      async listPermissions() {
        return permissions;
      },
      async savePermission(_userId, permission) {
        permissions.push(permission);
        return {
          status: 'created',
          value: permission,
          message: 'Permission cloud créée.',
        };
      },
    },
  };
}

describe('socialCloudFriendshipService', () => {
  it('synchronise une demande acceptée en amitié cloud et permission résumé', async () => {
    const ports = createPorts();

    const result = await syncAcceptedCloudFriendship({
      currentUserId: 'social-user:alex' as EntityId,
      acceptedRequest: request,
      counterpartProfile: profile,
      friendshipPort: ports.friendshipPort,
      permissionPort: ports.permissionPort,
      snapshot,
      now: '2026-07-05T12:31:00.000Z',
    });

    expect(result.status).toBe('synced');
    expect(ports.friendships).toEqual([
      expect.objectContaining({
        id: 'cloud-friendship:social-user:alex<->social-user:lina',
        status: 'active',
      }),
    ]);
    expect(ports.permissions).toEqual([
      expect.objectContaining({
        friendUserId: profile.userId,
        sharingLevel: 'summary',
        detailedConsent: 'notRequested',
      }),
    ]);
    expect(result.snapshot?.friends).toEqual([
      expect.objectContaining({
        userId: profile.userId,
        handle: profile.handle,
      }),
    ]);
  });

  it('refuse de synchroniser une demande non acceptée', async () => {
    const ports = createPorts();

    const result = await syncAcceptedCloudFriendship({
      currentUserId: 'social-user:alex' as EntityId,
      acceptedRequest: { ...request, status: 'pending' },
      counterpartProfile: profile,
      friendshipPort: ports.friendshipPort,
      permissionPort: ports.permissionPort,
    });

    expect(result.status).toBe('notAccepted');
    expect(ports.friendships).toHaveLength(0);
  });

  it('refuse une demande acceptée qui ne concerne pas le compte courant', async () => {
    const ports = createPorts();

    const result = await syncAcceptedCloudFriendship({
      currentUserId: 'social-user:other' as EntityId,
      acceptedRequest: request,
      counterpartProfile: profile,
      friendshipPort: ports.friendshipPort,
      permissionPort: ports.permissionPort,
    });

    expect(result.status).toBe('notParticipant');
  });
});
