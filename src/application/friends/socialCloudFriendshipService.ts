import type { EntityId, IsoDateTime } from '@/domain/models/common';
import type {
  SocialCloudFriendPermissionPort,
  SocialCloudFriendshipPort,
} from '@/domain/friends/socialCloudContract';
import {
  buildCloudFriendPermissionRecord,
  buildCloudFriendshipFromAcceptedRequest,
  cloudFriendshipToFriendProfileSummary,
  mergeCloudFriendPermissionsIntoSnapshot,
  mergeCloudFriendshipsIntoSnapshot,
} from '@/domain/friends/socialCloudFriendship';
import type { FriendsPrivacySnapshot } from '@/domain/friends/friendship';
import type { CloudFriendRequest, CloudFriendship, PublicUserProfile } from '@/domain/friends/socialIdentity';

export type SocialCloudFriendshipSyncStatus =
  | 'synced'
  | 'notAccepted'
  | 'notParticipant'
  | 'unavailable';

export interface SyncAcceptedCloudFriendshipInput {
  readonly currentUserId: EntityId;
  readonly acceptedRequest: CloudFriendRequest;
  readonly counterpartProfile: PublicUserProfile;
  readonly friendshipPort: SocialCloudFriendshipPort;
  readonly permissionPort: SocialCloudFriendPermissionPort;
  readonly snapshot?: FriendsPrivacySnapshot;
  readonly now?: IsoDateTime;
}

export interface SyncAcceptedCloudFriendshipResult {
  readonly status: SocialCloudFriendshipSyncStatus;
  readonly message: string;
  readonly friendship?: CloudFriendship;
  readonly snapshot?: FriendsPrivacySnapshot;
}

function isParticipant(request: CloudFriendRequest, userId: EntityId): boolean {
  return request.requesterUserId === userId || request.recipientUserId === userId;
}

export async function syncAcceptedCloudFriendship(
  input: SyncAcceptedCloudFriendshipInput,
): Promise<SyncAcceptedCloudFriendshipResult> {
  if (input.acceptedRequest.status !== 'accepted') {
    return {
      status: 'notAccepted',
      message: 'La relation cloud ne peut être créée qu’après acceptation explicite de la demande.',
    };
  }

  if (!isParticipant(input.acceptedRequest, input.currentUserId)) {
    return {
      status: 'notParticipant',
      message: 'Cette demande acceptée ne concerne pas le compte courant.',
    };
  }

  const now = input.now ?? new Date().toISOString();
  const friendship = buildCloudFriendshipFromAcceptedRequest(input.acceptedRequest, now);
  const friendshipResult = await input.friendshipPort.upsertFriendship(friendship);

  if (!['created', 'updated', 'alreadyExists'].includes(friendshipResult.status)) {
    return {
      status: 'unavailable',
      message: friendshipResult.message,
    };
  }

  const friend = cloudFriendshipToFriendProfileSummary(friendship, input.currentUserId, input.counterpartProfile);
  if (!friend) {
    return {
      status: 'notParticipant',
      message: 'Le profil distant ne correspond pas à la relation cloud acceptée.',
      friendship,
    };
  }

  const permissionRecord = buildCloudFriendPermissionRecord(input.currentUserId, friend, undefined, now);
  const permissionResult = await input.permissionPort.savePermission(input.currentUserId, permissionRecord);

  if (!['created', 'updated', 'alreadyExists'].includes(permissionResult.status)) {
    return {
      status: 'unavailable',
      message: permissionResult.message,
      friendship,
    };
  }

  if (!input.snapshot) {
    return {
      status: 'synced',
      message: 'Amitié cloud synchronisée avec permission résumé par défaut.',
      friendship,
    };
  }

  const withFriend = mergeCloudFriendshipsIntoSnapshot(
    input.snapshot,
    input.currentUserId,
    [friendship],
    [input.counterpartProfile],
  );
  const withPermission = mergeCloudFriendPermissionsIntoSnapshot(withFriend, [permissionRecord]);

  return {
    status: 'synced',
    message: 'Amitié cloud synchronisée avec permission résumé par défaut.',
    friendship,
    snapshot: withPermission,
  };
}
