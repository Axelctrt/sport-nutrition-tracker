import type { EntityId, IsoDateTime } from '@/domain/models/common';
import type {
  CloudFriendRequest,
  CloudFriendship,
  PublicUserProfile,
  SocialIdentity,
  SocialUserLookupResult,
} from '@/domain/friends/socialIdentity';
import type { FriendActivityPermission } from '@/domain/friends/friendship';
import type { SocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshot';

export const SOCIAL_CLOUD_CONTRACT_VERSION = '0.28.0-f1' as const;

export const SOCIAL_CLOUD_REQUIRED_COLLECTIONS = [
  'socialIdentities',
  'socialHandleReservations',
  'socialFriendRequests',
  'socialFriendships',
  'socialFriendPermissions',
  'socialActivitySnapshots',
] as const;

export type SocialCloudRequiredCollection = (typeof SOCIAL_CLOUD_REQUIRED_COLLECTIONS)[number];

export const SOCIAL_CLOUD_FORBIDDEN_FEATURES = [
  'globalUserDirectory',
  'publicSuggestions',
  'rawActivityExport',
  'likes',
  'comments',
  'messaging',
  'groups',
  'leaderboards',
] as const;

export type SocialCloudForbiddenFeature = (typeof SOCIAL_CLOUD_FORBIDDEN_FEATURES)[number];

export type SocialCloudReadinessStatus =
  | 'disabled'
  | 'contractReady'
  | 'missingSyncBackend'
  | 'missingAuthenticatedUser'
  | 'unavailable';

export interface SocialCloudReadinessInput {
  readonly syncPrototypeEnabled: boolean;
  readonly socialCloudEnabled: boolean;
  readonly databaseUrl?: string;
  readonly authenticatedUserId?: EntityId | string;
}

export interface SocialCloudReadiness {
  readonly status: SocialCloudReadinessStatus;
  readonly contractVersion: typeof SOCIAL_CLOUD_CONTRACT_VERSION;
  readonly canLookupUsers: boolean;
  readonly canReserveHandle: boolean;
  readonly canSendFriendRequests: boolean;
  readonly canPublishSnapshots: boolean;
  readonly canReadFeedSnapshots: boolean;
  readonly requiredCollections: readonly SocialCloudRequiredCollection[];
  readonly forbiddenFeatures: readonly SocialCloudForbiddenFeature[];
  readonly message: string;
}

export type SocialCloudMutationStatus =
  | 'created'
  | 'updated'
  | 'alreadyExists'
  | 'conflict'
  | 'invalidHandle'
  | 'notFound'
  | 'forbidden'
  | 'unavailable';

export interface SocialCloudMutationResult<T> {
  readonly status: SocialCloudMutationStatus;
  readonly value?: T;
  readonly message: string;
}

export interface SocialCloudIdentityPort {
  readonly readCurrentIdentity: (userId: EntityId) => Promise<SocialIdentity | undefined>;
  readonly publishIdentity: (identity: SocialIdentity) => Promise<SocialCloudMutationResult<SocialIdentity>>;
  readonly reserveHandle: (identity: SocialIdentity) => Promise<SocialCloudMutationResult<SocialIdentity>>;
  readonly lookupByHandle: (handle: string) => Promise<SocialUserLookupResult>;
}

export interface SocialCloudFriendRequestPort {
  readonly sendRequest: (request: CloudFriendRequest) => Promise<SocialCloudMutationResult<CloudFriendRequest>>;
  readonly listIncomingRequests: (userId: EntityId) => Promise<readonly CloudFriendRequest[]>;
  readonly listOutgoingRequests: (userId: EntityId) => Promise<readonly CloudFriendRequest[]>;
  readonly updateRequestStatus: (
    requestId: EntityId | string,
    status: CloudFriendRequest['status'],
    respondedAt: IsoDateTime,
  ) => Promise<SocialCloudMutationResult<CloudFriendRequest>>;
}

export interface SocialCloudFriendshipPort {
  readonly listFriendships: (userId: EntityId) => Promise<readonly CloudFriendship[]>;
  readonly upsertFriendship: (friendship: CloudFriendship) => Promise<SocialCloudMutationResult<CloudFriendship>>;
}

export interface SocialCloudFriendPermissionPort {
  readonly listPermissions: (userId: EntityId) => Promise<readonly FriendActivityPermission[]>;
  readonly savePermission: (
    userId: EntityId,
    permission: FriendActivityPermission,
  ) => Promise<SocialCloudMutationResult<FriendActivityPermission>>;
}

export interface SocialCloudActivitySnapshotPort {
  readonly publishSnapshots: (
    userId: EntityId,
    snapshots: readonly SocialActivitySnapshot[],
  ) => Promise<SocialCloudMutationResult<readonly SocialActivitySnapshot[]>>;
  readonly listFeedSnapshots: (userId: EntityId) => Promise<readonly SocialActivitySnapshot[]>;
}

export interface SocialCloudBackendPort {
  readonly identity: SocialCloudIdentityPort;
  readonly friendRequests: SocialCloudFriendRequestPort;
  readonly friendships: SocialCloudFriendshipPort;
  readonly permissions: SocialCloudFriendPermissionPort;
  readonly snapshots: SocialCloudActivitySnapshotPort;
}

export interface SocialCloudIdentityEnvelope {
  readonly userId: EntityId;
  readonly profile: PublicUserProfile;
  readonly handleReservedAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

function disabledReadiness(message: string, status: SocialCloudReadinessStatus): SocialCloudReadiness {
  return {
    status,
    contractVersion: SOCIAL_CLOUD_CONTRACT_VERSION,
    canLookupUsers: false,
    canReserveHandle: false,
    canSendFriendRequests: false,
    canPublishSnapshots: false,
    canReadFeedSnapshots: false,
    requiredCollections: SOCIAL_CLOUD_REQUIRED_COLLECTIONS,
    forbiddenFeatures: SOCIAL_CLOUD_FORBIDDEN_FEATURES,
    message,
  };
}

export function evaluateSocialCloudReadiness(input: SocialCloudReadinessInput): SocialCloudReadiness {
  if (!input.syncPrototypeEnabled) {
    return disabledReadiness(
      'Synchronisation Dexie Cloud désactivée : le backend social réel reste indisponible.',
      'disabled',
    );
  }

  if (!input.databaseUrl) {
    return disabledReadiness(
      'URL Dexie Cloud absente : impossible de préparer le backend social réel.',
      'missingSyncBackend',
    );
  }

  if (!input.socialCloudEnabled) {
    return disabledReadiness(
      'Contrat cloud social prêt, mais flag social réel désactivé.',
      'contractReady',
    );
  }

  if (!input.authenticatedUserId) {
    return disabledReadiness(
      'Cloud social activé, mais aucun utilisateur authentifié n’est disponible.',
      'missingAuthenticatedUser',
    );
  }

  return {
    status: 'contractReady',
    contractVersion: SOCIAL_CLOUD_CONTRACT_VERSION,
    canLookupUsers: true,
    canReserveHandle: true,
    canSendFriendRequests: true,
    canPublishSnapshots: true,
    canReadFeedSnapshots: true,
    requiredCollections: SOCIAL_CLOUD_REQUIRED_COLLECTIONS,
    forbiddenFeatures: SOCIAL_CLOUD_FORBIDDEN_FEATURES,
    message: 'Contrat cloud social prêt : les adapters réels peuvent être branchés sans exposer d’activité brute.',
  };
}

export function assertSocialCloudContractIntegrity(): true {
  const uniqueCollections = new Set(SOCIAL_CLOUD_REQUIRED_COLLECTIONS);
  if (uniqueCollections.size !== SOCIAL_CLOUD_REQUIRED_COLLECTIONS.length) {
    throw new Error('Le contrat cloud social contient des collections dupliquées.');
  }

  if (!SOCIAL_CLOUD_REQUIRED_COLLECTIONS.includes('socialHandleReservations')) {
    throw new Error('Le contrat cloud social doit réserver les handles séparément des profils publics.');
  }

  if (!SOCIAL_CLOUD_REQUIRED_COLLECTIONS.includes('socialFriendRequests')) {
    throw new Error('Le contrat cloud social doit préparer les demandes d’amis cloud par userId.');
  }

  if (!SOCIAL_CLOUD_REQUIRED_COLLECTIONS.includes('socialFriendships')) {
    throw new Error('Le contrat cloud social doit préparer les amitiés cloud stables par userId.');
  }

  if (!SOCIAL_CLOUD_REQUIRED_COLLECTIONS.includes('socialFriendPermissions')) {
    throw new Error('Le contrat cloud social doit synchroniser les permissions par ami sans activité brute.');
  }

  if (!SOCIAL_CLOUD_REQUIRED_COLLECTIONS.includes('socialActivitySnapshots')) {
    throw new Error('Le contrat cloud social doit publier uniquement des snapshots sociaux filtrés.');
  }

  if (!SOCIAL_CLOUD_FORBIDDEN_FEATURES.includes('rawActivityExport')) {
    throw new Error('Le contrat cloud social doit interdire l’export brut d’activité.');
  }

  return true;
}
