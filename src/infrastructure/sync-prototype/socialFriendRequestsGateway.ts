import type { EntityId, IsoDateTime } from '@/domain/models/common';
import type { SocialCloudFriendRequestPort, SocialCloudMutationResult } from '@/domain/friends/socialCloudContract';
import type { CloudFriendRequest, PublicUserProfile } from '@/domain/friends/socialIdentity';
import {
  resolveSocialCloudApiCredentials,
  socialCloudApiHeaders,
  type SocialCloudApiCredentialsProvider,
} from '@/infrastructure/sync-prototype/socialCloudApiCredentials';

export interface SocialFriendRequestsClientOptions {
  readonly endpoint?: string;
  readonly fetcher?: typeof fetch;
  readonly getCredentials?: SocialCloudApiCredentialsProvider;
}

interface SocialFriendRequestPayload {
  readonly id?: unknown;
  readonly requesterUserId?: unknown;
  readonly recipientUserId?: unknown;
  readonly status?: unknown;
  readonly requestedAt?: unknown;
  readonly respondedAt?: unknown;
  readonly createdAt?: unknown;
  readonly updatedAt?: unknown;
}

interface SocialFriendRequestProfilePayload {
  readonly userId?: unknown;
  readonly handle?: unknown;
  readonly displayName?: unknown;
  readonly createdAt?: unknown;
  readonly updatedAt?: unknown;
}

interface SocialFriendRequestsResponsePayload {
  readonly status?: unknown;
  readonly message?: unknown;
  readonly request?: SocialFriendRequestPayload;
  readonly requests?: readonly SocialFriendRequestPayload[];
  readonly profiles?: readonly SocialFriendRequestProfilePayload[];
}

export interface SocialFriendRequestsListResult {
  readonly status: 'synchronized';
  readonly requests: readonly CloudFriendRequest[];
  readonly profiles: readonly PublicUserProfile[];
}

export interface SocialFriendRequestsProfiledPort extends SocialCloudFriendRequestPort {
  readonly listIncomingRequestsWithProfiles: (userId: EntityId) => Promise<SocialFriendRequestsListResult>;
  readonly listOutgoingRequestsWithProfiles: (userId: EntityId) => Promise<SocialFriendRequestsListResult>;
}

export function supportsProfiledSocialFriendRequestsPort(
  port: SocialCloudFriendRequestPort,
): port is SocialFriendRequestsProfiledPort {
  const candidate = port as Partial<SocialFriendRequestsProfiledPort>;
  return typeof candidate.listIncomingRequestsWithProfiles === 'function'
    && typeof candidate.listOutgoingRequestsWithProfiles === 'function';
}

function readConfiguredEndpoint(): string | undefined {
  const explicit = import.meta.env.VITE_SOCIAL_FRIEND_REQUESTS_ENDPOINT;
  if (typeof explicit === 'string' && explicit.trim().length > 0) {
    return explicit.trim().replace(/\/+$/u, '');
  }

  const directory = import.meta.env.VITE_SOCIAL_DIRECTORY_ENDPOINT;
  if (typeof directory === 'string' && directory.trim().length > 0) {
    return directory.trim().replace(/\/+$/u, '').replace(/\/social-directory$/u, '/social-friend-requests');
  }

  return undefined;
}

function unavailableMutation<T>(message = 'Demandes sociales serveur indisponibles.'): SocialCloudMutationResult<T> {
  return { status: 'unavailable', message };
}

function responseMessage(payload: SocialFriendRequestsResponsePayload, fallback: string): string {
  return typeof payload.message === 'string' && payload.message.trim().length > 0
    ? payload.message.trim()
    : fallback;
}

function toCloudFriendRequest(payload?: SocialFriendRequestPayload): CloudFriendRequest | undefined {
  if (!payload) return undefined;
  if (
    typeof payload.id !== 'string'
    || typeof payload.requesterUserId !== 'string'
    || typeof payload.recipientUserId !== 'string'
    || typeof payload.status !== 'string'
    || !['pending', 'accepted', 'declined', 'cancelled'].includes(payload.status)
    || typeof payload.requestedAt !== 'string'
    || typeof payload.createdAt !== 'string'
    || typeof payload.updatedAt !== 'string'
  ) {
    return undefined;
  }

  const requestStatus = payload.status as CloudFriendRequest['status'];

  const request: CloudFriendRequest = {
    id: payload.id as EntityId,
    requesterUserId: payload.requesterUserId as EntityId,
    recipientUserId: payload.recipientUserId as EntityId,
    status: requestStatus,
    requestedAt: payload.requestedAt as IsoDateTime,
    createdAt: payload.createdAt as IsoDateTime,
    updatedAt: payload.updatedAt as IsoDateTime,
  };

  return typeof payload.respondedAt === 'string'
    ? { ...request, respondedAt: payload.respondedAt as IsoDateTime }
    : request;
}

function toPublicUserProfile(payload?: SocialFriendRequestProfilePayload): PublicUserProfile | undefined {
  if (
    !payload
    || typeof payload.userId !== 'string'
    || typeof payload.handle !== 'string'
    || typeof payload.displayName !== 'string'
    || typeof payload.createdAt !== 'string'
    || typeof payload.updatedAt !== 'string'
  ) return undefined;

  return {
    userId: payload.userId as EntityId,
    handle: payload.handle,
    displayName: payload.displayName,
    createdAt: payload.createdAt as IsoDateTime,
    updatedAt: payload.updatedAt as IsoDateTime,
  };
}

async function readPayload(response: Response): Promise<SocialFriendRequestsResponsePayload> {
  try {
    const payload = await response.json();
    return payload && typeof payload === 'object' ? payload as SocialFriendRequestsResponsePayload : {};
  } catch {
    return {};
  }
}

function mutationFromResponse<T>(
  response: Response,
  payload: SocialFriendRequestsResponsePayload,
  value: T | undefined,
  fallbackMessage: string,
): SocialCloudMutationResult<T> {
  const message = responseMessage(payload, fallbackMessage);

  if (response.status === 404 || payload.status === 'notFound') return { status: 'notFound', message };
  if (response.status === 403 || payload.status === 'forbidden') return { status: 'forbidden', message };
  if (response.status === 409 || payload.status === 'conflict') return { status: 'conflict', ...(value ? { value } : {}), message };
  if (!response.ok || payload.status === 'unavailable') return unavailableMutation(message);

  if (payload.status === 'alreadyExists') return { status: 'alreadyExists', ...(value ? { value } : {}), message };
  if (payload.status === 'updated') return { status: 'updated', ...(value ? { value } : {}), message };
  return { status: 'created', ...(value ? { value } : {}), message };
}

export function createSocialFriendRequestsClient(
  options: SocialFriendRequestsClientOptions = {},
): SocialFriendRequestsProfiledPort {
  const endpoint = options.endpoint?.trim().replace(/\/+$/u, '') || readConfiguredEndpoint();
  const fetcher = options.fetcher ?? globalThis.fetch?.bind(globalThis);
  const getCredentials = options.getCredentials;

  async function listRequestsWithProfiles(
    direction: 'incoming' | 'outgoing',
    userId: EntityId,
  ): Promise<SocialFriendRequestsListResult> {
    if (!endpoint || !fetcher) throw new Error('Demandes sociales serveur indisponibles.');
    const credentials = resolveSocialCloudApiCredentials(getCredentials, userId);
    if (!credentials) throw new Error('Connexion SportPilot requise.');

    const response = await fetcher(`${endpoint}/${direction}?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
      cache: 'no-store',
      headers: socialCloudApiHeaders(credentials),
    });
    const payload = await readPayload(response);
    if (!response.ok) {
      throw new Error(responseMessage(payload, 'Demandes sociales serveur indisponibles.'));
    }

    return {
      status: 'synchronized',
      requests: Array.isArray(payload.requests)
        ? payload.requests.map(toCloudFriendRequest).filter((request): request is CloudFriendRequest => Boolean(request))
        : [],
      profiles: Array.isArray(payload.profiles)
        ? payload.profiles.map(toPublicUserProfile).filter((profile): profile is PublicUserProfile => Boolean(profile))
        : [],
    };
  }

  return {
    async sendRequest(request) {
      if (!endpoint || !fetcher) return unavailableMutation();
      const credentials = resolveSocialCloudApiCredentials(getCredentials, request.requesterUserId);
      if (!credentials) return unavailableMutation('Connexion SportPilot requise.');

      try {
        const response = await fetcher(`${endpoint}/send`, {
          method: 'POST',
          cache: 'no-store',
          headers: socialCloudApiHeaders(credentials, true),
          body: JSON.stringify({
            requesterUserId: request.requesterUserId,
            recipientUserId: request.recipientUserId,
            requestedAt: request.requestedAt,
            createdAt: request.createdAt,
          }),
        });
        const payload = await readPayload(response);
        const cloudRequest = toCloudFriendRequest(payload.request);
        return mutationFromResponse(response, payload, cloudRequest, 'Demande d’ami cloud envoyée.');
      } catch {
        return unavailableMutation();
      }
    },

    async listIncomingRequests(userId) {
      try {
        return (await listRequestsWithProfiles('incoming', userId)).requests;
      } catch {
        return [];
      }
    },

    async listOutgoingRequests(userId) {
      try {
        return (await listRequestsWithProfiles('outgoing', userId)).requests;
      } catch {
        return [];
      }
    },

    listIncomingRequestsWithProfiles(userId) {
      return listRequestsWithProfiles('incoming', userId);
    },

    listOutgoingRequestsWithProfiles(userId) {
      return listRequestsWithProfiles('outgoing', userId);
    },

    async updateRequestStatus(requestId, status, respondedAt) {
      if (!endpoint || !fetcher) return unavailableMutation();
      const credentials = resolveSocialCloudApiCredentials(getCredentials);
      if (!credentials) return unavailableMutation('Connexion SportPilot requise.');

      try {
        const response = await fetcher(`${endpoint}/update-status`, {
          method: 'POST',
          cache: 'no-store',
          headers: socialCloudApiHeaders(credentials, true),
          body: JSON.stringify({ requestId, status, respondedAt }),
        });
        const payload = await readPayload(response);
        const cloudRequest = toCloudFriendRequest(payload.request);
        return mutationFromResponse(response, payload, cloudRequest, 'Demande cloud mise à jour.');
      } catch {
        return unavailableMutation();
      }
    },
  };
}
