import type { EntityId } from '@/domain/models/common';
import type { SocialCloudMutationResult } from '@/domain/friends/socialCloudContract';
import { validateSocialHandle, type SocialIdentity, type SocialUserLookupResult } from '@/domain/friends/socialIdentity';

export interface SocialDirectoryLookupClient {
  readonly lookupByHandle: (handle: string) => Promise<SocialUserLookupResult>;
}

export interface SocialDirectoryClient extends SocialDirectoryLookupClient {
  readonly reserveIdentity: (identity: SocialIdentity) => Promise<SocialCloudMutationResult<SocialIdentity>>;
}

export interface SocialDirectoryClientOptions {
  readonly endpoint?: string;
  readonly fetcher?: typeof fetch;
}

interface SocialDirectoryProfilePayload {
  readonly userId?: unknown;
  readonly handle?: unknown;
  readonly displayName?: unknown;
  readonly createdAt?: unknown;
  readonly updatedAt?: unknown;
}

interface SocialDirectoryResponsePayload {
  readonly status?: unknown;
  readonly message?: unknown;
  readonly profile?: SocialDirectoryProfilePayload;
}

function readConfiguredEndpoint(): string | undefined {
  const value = import.meta.env.VITE_SOCIAL_DIRECTORY_ENDPOINT;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().replace(/\/+$/u, '');
  return normalized.length > 0 ? normalized : undefined;
}

function unavailableMutation<T>(message = 'Annuaire social serveur indisponible.'): SocialCloudMutationResult<T> {
  return { status: 'unavailable', message };
}

function unavailableLookup(): SocialUserLookupResult {
  return { status: 'unavailable' };
}

function responseMessage(payload: SocialDirectoryResponsePayload, fallback: string): string {
  return typeof payload.message === 'string' && payload.message.trim().length > 0
    ? payload.message.trim()
    : fallback;
}

function toPublicProfile(payload?: SocialDirectoryProfilePayload): SocialUserLookupResult {
  if (!payload) return { status: 'unavailable' };
  if (
    typeof payload.userId !== 'string'
    || typeof payload.handle !== 'string'
    || typeof payload.displayName !== 'string'
    || typeof payload.createdAt !== 'string'
    || typeof payload.updatedAt !== 'string'
  ) {
    return { status: 'unavailable' };
  }

  return {
    status: 'found',
    profile: {
      userId: payload.userId as EntityId,
      handle: payload.handle,
      displayName: payload.displayName,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
    },
  } as SocialUserLookupResult;
}

async function readPayload(response: Response): Promise<SocialDirectoryResponsePayload> {
  try {
    const payload = await response.json();
    return payload && typeof payload === 'object' ? payload as SocialDirectoryResponsePayload : {};
  } catch {
    return {};
  }
}

export function createSocialDirectoryClient(options: SocialDirectoryClientOptions = {}): SocialDirectoryClient {
  const endpoint = options.endpoint?.trim().replace(/\/+$/u, '') || readConfiguredEndpoint();
  const fetcher = options.fetcher ?? globalThis.fetch?.bind(globalThis);

  return {
    async lookupByHandle(handle) {
      const validation = validateSocialHandle(handle);
      if (validation.status === 'invalid') return { status: 'invalidHandle' };
      if (!endpoint || !fetcher) return unavailableLookup();

      try {
        const response = await fetcher(`${endpoint}/lookup?handle=${encodeURIComponent(validation.handle)}`, {
          method: 'GET',
          headers: { accept: 'application/json' },
        });
        const payload = await readPayload(response);

        if (response.status === 404 || payload.status === 'notFound') return { status: 'notFound' };
        if (response.status === 400 || payload.status === 'invalidHandle') return { status: 'invalidHandle' };
        if (!response.ok) return { status: 'unavailable' };

        if (payload.status === 'found') return toPublicProfile(payload.profile);
        return { status: 'unavailable' };
      } catch {
        return { status: 'unavailable' };
      }
    },

    async reserveIdentity(identity) {
      const validation = validateSocialHandle(identity.handle);
      if (validation.status === 'invalid') {
        return { status: 'invalidHandle', message: validation.message };
      }
      if (!endpoint || !fetcher) return unavailableMutation();

      try {
        const response = await fetcher(`${endpoint}/reserve`, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            userId: identity.userId,
            handle: validation.handle,
            displayName: identity.displayName,
          }),
        });
        const payload = await readPayload(response);
        const message = responseMessage(payload, 'Réservation annuaire social traitée.');

        if (response.status === 409 || payload.status === 'conflict') {
          return { status: 'conflict', message };
        }
        if (response.status === 400 || payload.status === 'invalidHandle') {
          return { status: 'invalidHandle', message };
        }
        if (!response.ok) return unavailableMutation(message);

        if (payload.status === 'alreadyExists') {
          return { status: 'alreadyExists', value: identity, message };
        }
        if (payload.status === 'updated') {
          return { status: 'updated', value: identity, message };
        }
        return { status: 'created', value: identity, message };
      } catch {
        return unavailableMutation();
      }
    },
  };
}
