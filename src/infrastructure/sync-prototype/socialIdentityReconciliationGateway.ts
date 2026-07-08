import type {
  SocialIdentityCloudCredentials,
  SocialIdentityReconciliationGateway,
  SocialIdentityReconciliationInput,
  SocialIdentityReconciliationResult,
} from '@/application/friends/socialIdentityReconciliationService';
import type { EntityId } from '@/domain/models/common';
import type { SocialIdentity } from '@/domain/friends/socialIdentity';

export interface SocialIdentityReconciliationGatewayOptions {
  readonly endpoint?: string;
  readonly fetcher?: typeof fetch;
}

interface ReconciliationPayload {
  readonly status?: unknown;
  readonly message?: unknown;
  readonly identity?: unknown;
  readonly migratedUserIds?: unknown;
}

function parseIdentity(value: unknown): SocialIdentity | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
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
    ...(typeof candidate.handleUpdatedAt === 'string'
      ? { handleUpdatedAt: candidate.handleUpdatedAt }
      : {}),
  };
}

function parseMigratedUserIds(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function fallbackResult(
  input: SocialIdentityReconciliationInput,
  status: SocialIdentityReconciliationResult['status'],
  message: string,
): SocialIdentityReconciliationResult {
  return {
    status,
    identity: {
      userId: input.previousUserId,
      handle: input.handle,
      displayName: input.displayName,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      ...(input.handleUpdatedAt ? { handleUpdatedAt: input.handleUpdatedAt } : {}),
    },
    migratedUserIds: [],
    message,
  };
}

async function readPayload(response: Response): Promise<ReconciliationPayload> {
  try {
    const payload = await response.json();
    return payload && typeof payload === 'object'
      ? payload as ReconciliationPayload
      : {};
  } catch {
    return {};
  }
}

export function createSocialIdentityReconciliationGateway(
  options: SocialIdentityReconciliationGatewayOptions = {},
): SocialIdentityReconciliationGateway {
  const endpoint = options.endpoint?.trim() || '/api/social-identity/reconcile';
  const fetcher = options.fetcher ?? globalThis.fetch?.bind(globalThis);

  return {
    async reconcile(
      credentials: SocialIdentityCloudCredentials,
      input: SocialIdentityReconciliationInput,
    ): Promise<SocialIdentityReconciliationResult> {
      if (!fetcher) {
        return fallbackResult(input, 'unavailable', 'Réconciliation sociale indisponible.');
      }

      try {
        const response = await fetcher(endpoint, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${credentials.accessToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(input),
        });
        const payload = await readPayload(response);
        const identity = parseIdentity(payload.identity);
        const message = typeof payload.message === 'string'
          ? payload.message
          : 'Réconciliation sociale traitée.';

        if (response.status === 409) {
          return fallbackResult(input, 'conflict', message);
        }
        if (!response.ok || !identity) {
          return fallbackResult(input, 'unavailable', message);
        }

        const status = payload.status === 'alreadyCanonical'
          ? 'alreadyCanonical'
          : 'reconciled';
        return {
          status,
          identity,
          migratedUserIds: parseMigratedUserIds(payload.migratedUserIds),
          message,
        };
      } catch {
        return fallbackResult(input, 'unavailable', 'Réconciliation sociale indisponible.');
      }
    },
  };
}
