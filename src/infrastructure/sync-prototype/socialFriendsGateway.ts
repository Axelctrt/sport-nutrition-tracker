import type { EntityId } from '@/domain/models/common';
import type { FriendActivityPermission } from '@/domain/friends/friendship';
import {
  ALL_SOCIAL_ACTIVITY_FIELD_SELECTION,
  SUMMARY_SOCIAL_ACTIVITY_FIELD_SELECTION,
  cloneSocialActivityFieldSelection,
  normalizeSocialActivityFieldSelection,
} from '@/domain/friends/socialActivitySharingPolicy';
import { socialActivityFieldSelectionSchema } from '@/shared/validation/socialActivitySharingSchema';
import type {
  SocialCloudFriendPermissionPort,
  SocialCloudFriendshipPort,
  SocialCloudMutationResult,
} from '@/domain/friends/socialCloudContract';
import type { CloudFriendship, PublicUserProfile } from '@/domain/friends/socialIdentity';
import {
  resolveSocialCloudApiCredentials,
  socialCloudApiHeaders,
  type SocialCloudApiCredentialsProvider,
} from '@/infrastructure/sync-prototype/socialCloudApiCredentials';

export type SocialFriendsGatewayListStatus = 'synchronized' | 'unavailable';

export interface SocialFriendsGatewayListResult {
  readonly status?: SocialFriendsGatewayListStatus;
  readonly friendships: readonly CloudFriendship[];
  readonly profiles: readonly PublicUserProfile[];
  readonly message?: string;
}

export interface SocialFriendPermissionsListResult {
  readonly status: SocialFriendsGatewayListStatus;
  readonly permissions: readonly FriendActivityPermission[];
  readonly message?: string;
}

export interface SocialFriendsGateway {
  readonly friendshipPort: SocialCloudFriendshipPort;
  readonly permissionPort: SocialCloudFriendPermissionPort;
  readonly listFriendshipsWithProfiles: (userId: EntityId) => Promise<SocialFriendsGatewayListResult>;
  readonly listPermissionsWithStatus?: (userId: EntityId) => Promise<SocialFriendPermissionsListResult>;
  readonly removeFriendship?: (
    userId: EntityId,
    friendUserId: EntityId,
  ) => Promise<SocialCloudMutationResult<CloudFriendship>>;
}

interface SocialFriendsClientOptions {
  readonly endpoint?: string;
  readonly fetcher?: typeof fetch;
  readonly getCredentials?: SocialCloudApiCredentialsProvider;
}

type FriendMutationStatus = 'created' | 'updated' | 'alreadyExists' | 'forbidden' | 'notFound' | 'unavailable';

const friendshipStatuses = new Set(['active', 'removed']);
const sharingLevels = new Set(['none', 'summary', 'detailed']);
const detailedConsentStatuses = new Set(['notRequested', 'granted']);
const okMutationStatuses = new Set(['created', 'updated', 'alreadyExists']);

function normalizeEndpoint(endpoint: string | undefined): string {
  const raw = endpoint?.trim() || import.meta.env.VITE_SOCIAL_FRIENDS_ENDPOINT || '/api/social-friends';
  return raw.replace(/\/$/u, '');
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function payloadMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
    return payload.message;
  }
  return fallback;
}

function parseProfile(value: unknown): PublicUserProfile | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.userId !== 'string'
    || typeof candidate.handle !== 'string'
    || typeof candidate.displayName !== 'string'
    || typeof candidate.createdAt !== 'string'
    || typeof candidate.updatedAt !== 'string'
  ) {
    return undefined;
  }

  return {
    userId: candidate.userId as EntityId,
    handle: candidate.handle,
    displayName: candidate.displayName,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  };
}

function parseFriendship(value: unknown): CloudFriendship | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== 'string'
    || typeof candidate.userAId !== 'string'
    || typeof candidate.userBId !== 'string'
    || typeof candidate.status !== 'string'
    || !friendshipStatuses.has(candidate.status)
    || typeof candidate.createdAt !== 'string'
    || typeof candidate.updatedAt !== 'string'
  ) {
    return undefined;
  }

  return {
    id: candidate.id as EntityId,
    userAId: candidate.userAId as EntityId,
    userBId: candidate.userBId as EntityId,
    status: candidate.status as CloudFriendship['status'],
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  };
}

function parsePermission(value: unknown): FriendActivityPermission | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== 'string'
    || typeof candidate.friendUserId !== 'string'
    || typeof candidate.friendHandle !== 'string'
    || typeof candidate.sharingLevel !== 'string'
    || !sharingLevels.has(candidate.sharingLevel)
    || typeof candidate.detailedConsent !== 'string'
    || !detailedConsentStatuses.has(candidate.detailedConsent)
  ) {
    return undefined;
  }

  const parsedFieldSelection = candidate.fieldSelection === undefined
    ? cloneSocialActivityFieldSelection(ALL_SOCIAL_ACTIVITY_FIELD_SELECTION)
    : (() => {
        const parsed = socialActivityFieldSelectionSchema.safeParse(candidate.fieldSelection);
        return parsed.success
          ? normalizeSocialActivityFieldSelection(parsed.data)
          : cloneSocialActivityFieldSelection(SUMMARY_SOCIAL_ACTIVITY_FIELD_SELECTION);
      })();

  return {
    id: candidate.id as EntityId,
    friendUserId: candidate.friendUserId as EntityId,
    friendHandle: candidate.friendHandle,
    sharingLevel: candidate.sharingLevel as FriendActivityPermission['sharingLevel'],
    detailedConsent: candidate.detailedConsent as FriendActivityPermission['detailedConsent'],
    ...(typeof candidate.detailedConsentGrantedAt === 'string'
      ? { detailedConsentGrantedAt: candidate.detailedConsentGrantedAt }
      : {}),
    fieldSelection: parsedFieldSelection,
  };
}

function parseMutationStatus(value: unknown): FriendMutationStatus {
  if (
    value === 'created'
    || value === 'updated'
    || value === 'alreadyExists'
    || value === 'forbidden'
    || value === 'notFound'
  ) return value;
  return 'unavailable';
}

export function createSocialFriendsGateway(options: SocialFriendsClientOptions = {}): SocialFriendsGateway {
  const endpoint = normalizeEndpoint(options.endpoint);
  const fetcher = options.fetcher ?? fetch;
  const getCredentials = options.getCredentials;

  async function listFriendshipsWithProfiles(userId: EntityId): Promise<SocialFriendsGatewayListResult> {
    const credentials = resolveSocialCloudApiCredentials(getCredentials, userId);
    if (!credentials) {
      return {
        status: 'unavailable',
        friendships: [],
        profiles: [],
        message: 'Connexion SportPilot requise. Le cache local est conservé.',
      };
    }
    let response: Response;
    try {
      response = await fetcher(`${endpoint}/friendships?userId=${encodeURIComponent(userId)}`, {
        method: 'GET',
        cache: 'no-store',
        headers: socialCloudApiHeaders(credentials),
      });
    } catch {
      return {
        status: 'unavailable',
        friendships: [],
        profiles: [],
        message: 'Amitiés serveur indisponibles. Le cache local est conservé.',
      };
    }

    const payload = await readJson(response);
    if (!response.ok) {
      return {
        status: 'unavailable',
        friendships: [],
        profiles: [],
        message: payloadMessage(payload, 'Amitiés serveur indisponibles. Le cache local est conservé.'),
      };
    }
    if (
      !payload
      || typeof payload !== 'object'
      || !('friendships' in payload)
      || !Array.isArray(payload.friendships)
      || !('profiles' in payload)
      || !Array.isArray(payload.profiles)
    ) {
      return {
        status: 'unavailable',
        friendships: [],
        profiles: [],
        message: 'Réponse amitiés serveur invalide. Le cache local est conservé.',
      };
    }

    const rawFriendships = payload && typeof payload === 'object' && 'friendships' in payload && Array.isArray(payload.friendships)
      ? payload.friendships
      : [];
    const rawProfiles = payload && typeof payload === 'object' && 'profiles' in payload && Array.isArray(payload.profiles)
      ? payload.profiles
      : [];

    return {
      status: 'synchronized',
      friendships: rawFriendships.flatMap((friendship) => {
        const parsed = parseFriendship(friendship);
        return parsed ? [parsed] : [];
      }),
      profiles: rawProfiles.flatMap((profile) => {
        const parsed = parseProfile(profile);
        return parsed ? [parsed] : [];
      }),
    };
  }

  async function listPermissionsWithStatus(
    userId: EntityId,
  ): Promise<SocialFriendPermissionsListResult> {
    const credentials = resolveSocialCloudApiCredentials(getCredentials, userId);
    if (!credentials) {
      return {
        status: 'unavailable',
        permissions: [],
        message: 'Connexion SportPilot requise. Le cache local est conservé.',
      };
    }
    let response: Response;
    try {
      response = await fetcher(`${endpoint}/permissions?userId=${encodeURIComponent(userId)}`, {
        method: 'GET',
        cache: 'no-store',
        headers: socialCloudApiHeaders(credentials),
      });
    } catch {
      return {
        status: 'unavailable',
        permissions: [],
        message: 'Permissions serveur indisponibles. Le cache local est conservé.',
      };
    }

    const payload = await readJson(response);
    if (!response.ok) {
      return {
        status: 'unavailable',
        permissions: [],
        message: payloadMessage(payload, 'Permissions serveur indisponibles. Le cache local est conservé.'),
      };
    }
    if (
      !payload
      || typeof payload !== 'object'
      || !('permissions' in payload)
      || !Array.isArray(payload.permissions)
    ) {
      return {
        status: 'unavailable',
        permissions: [],
        message: 'Réponse permissions serveur invalide. Le cache local est conservé.',
      };
    }

    return {
      status: 'synchronized',
      permissions: payload.permissions.flatMap((permission) => {
        const parsed = parsePermission(permission);
        return parsed ? [parsed] : [];
      }),
    };
  }

  async function listPermissions(userId: EntityId): Promise<readonly FriendActivityPermission[]> {
    return (await listPermissionsWithStatus(userId)).permissions;
  }

  async function savePermission(
    userId: EntityId,
    permission: FriendActivityPermission,
  ): Promise<SocialCloudMutationResult<FriendActivityPermission>> {
    const credentials = resolveSocialCloudApiCredentials(getCredentials, userId);
    if (!credentials) {
      return {
        status: 'unavailable',
        message: 'Connexion SportPilot requise. Le réglage local précédent est conservé.',
      };
    }
    let response: Response;
    try {
      response = await fetcher(`${endpoint}/permissions/save`, {
        method: 'POST',
        cache: 'no-store',
        headers: socialCloudApiHeaders(credentials, true),
        body: JSON.stringify({ ownerUserId: userId, permission }),
      });
    } catch {
      return {
        status: 'unavailable',
        message: 'Permission ami serveur indisponible. Le réglage local précédent est conservé.',
      };
    }
    const payload = await readJson(response);
    const status = payload && typeof payload === 'object' && 'status' in payload
      ? parseMutationStatus(payload.status)
      : 'unavailable';
    const parsedPermission = payload && typeof payload === 'object' && 'permission' in payload
      ? parsePermission(payload.permission)
      : undefined;

    return {
      status: response.ok && okMutationStatuses.has(status) ? status : status,
      ...(parsedPermission ? { value: parsedPermission } : {}),
      message: payloadMessage(payload, response.ok ? 'Permission ami serveur mise à jour.' : 'Permission ami serveur indisponible.'),
    };
  }

  async function removeFriendship(
    userId: EntityId,
    friendUserId: EntityId,
  ): Promise<SocialCloudMutationResult<CloudFriendship>> {
    const credentials = resolveSocialCloudApiCredentials(getCredentials, userId);
    if (!credentials) {
      return {
        status: 'unavailable',
        message: 'Connexion SportPilot requise. La relation locale reste inchangée.',
      };
    }
    let response: Response;
    try {
      response = await fetcher(`${endpoint}/remove`, {
        method: 'POST',
        cache: 'no-store',
        headers: socialCloudApiHeaders(credentials, true),
        body: JSON.stringify({ userId, friendUserId }),
      });
    } catch {
      return {
        status: 'unavailable',
        message: 'Suppression ami serveur indisponible. La relation locale reste inchangée.',
      };
    }
    const payload = await readJson(response);
    const status = payload && typeof payload === 'object' && 'status' in payload
      ? parseMutationStatus(payload.status)
      : 'unavailable';
    const parsedFriendship = payload && typeof payload === 'object' && 'friendship' in payload
      ? parseFriendship(payload.friendship)
      : undefined;

    return {
      status: response.ok && okMutationStatuses.has(status) ? status : status,
      ...(parsedFriendship ? { value: parsedFriendship } : {}),
      message: payloadMessage(payload, response.ok ? 'Ami supprimé.' : 'Suppression ami serveur indisponible.'),
    };
  }

  return {
    friendshipPort: {
      async listFriendships(userId) {
        return (await listFriendshipsWithProfiles(userId)).friendships;
      },
      async upsertFriendship() {
        return {
          status: 'unavailable',
          message: 'Les amitiés serveur sont créées par acceptation de demande, pas par le client.',
        };
      },
      removeFriendship,
    },
    permissionPort: {
      listPermissions,
      savePermission,
    },
    listFriendshipsWithProfiles,
    listPermissionsWithStatus,
    removeFriendship,
  };
}
