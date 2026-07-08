import type { SocialActivitySnapshotOutboxRecord } from '@/domain/friends/socialActivitySnapshotOutbox';

export interface SocialActivitySnapshotCloudCredentials {
  readonly userId: string;
  readonly accessToken: string;
}

export type SocialActivitySnapshotCloudMutationStatus =
  | 'created'
  | 'updated'
  | 'alreadyExists'
  | 'stale';

export interface SocialActivitySnapshotCloudMutationResult {
  readonly status: SocialActivitySnapshotCloudMutationStatus;
  readonly mutationSequence: number;
}

export class SocialActivitySnapshotCloudError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable: boolean) {
    super(message);
    this.name = 'SocialActivitySnapshotCloudError';
    this.code = code;
    this.retryable = retryable;
  }
}

export interface SocialActivitySnapshotCloudGateway {
  readonly publish: (
    credentials: SocialActivitySnapshotCloudCredentials,
    record: SocialActivitySnapshotOutboxRecord,
  ) => Promise<SocialActivitySnapshotCloudMutationResult>;
}

interface SocialActivitySnapshotCloudGatewayOptions {
  readonly endpoint?: string;
  readonly fetcher?: typeof fetch;
}

function normalizeEndpoint(value: string | undefined): string {
  const endpoint = value?.trim() || '/api/social-activity-snapshots';
  return endpoint.replace(/\/$/u, '');
}

async function readPayload(response: Response): Promise<Record<string, unknown>> {
  try {
    const value = await response.json();
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function readMessage(payload: Record<string, unknown>, fallback: string): string {
  return typeof payload.message === 'string' && payload.message.trim()
    ? payload.message
    : fallback;
}

function readErrorCode(payload: Record<string, unknown>, fallback: string): string {
  return typeof payload.code === 'string' && payload.code.trim()
    ? payload.code
    : fallback;
}

function readMutationStatus(value: unknown): SocialActivitySnapshotCloudMutationStatus | undefined {
  return value === 'created'
    || value === 'updated'
    || value === 'alreadyExists'
    || value === 'stale'
    ? value
    : undefined;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export function createSocialActivitySnapshotCloudGateway(
  options: SocialActivitySnapshotCloudGatewayOptions = {},
): SocialActivitySnapshotCloudGateway {
  const endpoint = normalizeEndpoint(options.endpoint);
  const fetcher = options.fetcher ?? fetch;

  return {
    async publish(credentials, record) {
      if (!credentials.accessToken.trim()) {
        throw new SocialActivitySnapshotCloudError(
          'Session cloud absente pour publier le snapshot social.',
          'social_activity_auth_missing',
          false,
        );
      }
      if (credentials.userId !== record.ownerUserId) {
        throw new SocialActivitySnapshotCloudError(
          'Le snapshot social ne correspond pas au compte connecté.',
          'social_activity_owner_mismatch',
          false,
        );
      }

      let response: Response;
      try {
        response = await fetcher(`${endpoint}/sync`, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${credentials.accessToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            mutationSequence: record.mutationSequence,
            snapshot: record.snapshot,
          }),
        });
      } catch {
        throw new SocialActivitySnapshotCloudError(
          'Publication sociale indisponible hors ligne.',
          'social_activity_network_error',
          true,
        );
      }

      const payload = await readPayload(response);
      if (!response.ok) {
        throw new SocialActivitySnapshotCloudError(
          readMessage(payload, 'Publication du snapshot social refusée.'),
          readErrorCode(payload, `social_activity_http_${response.status}`),
          isRetryableStatus(response.status),
        );
      }

      const status = readMutationStatus(payload.status);
      const mutationSequence = typeof payload.mutationSequence === 'number'
        ? payload.mutationSequence
        : Number.NaN;
      if (!status || !Number.isSafeInteger(mutationSequence) || mutationSequence < 1) {
        throw new SocialActivitySnapshotCloudError(
          'Réponse serveur sociale invalide.',
          'social_activity_invalid_response',
          true,
        );
      }

      return { status, mutationSequence };
    },
  };
}
