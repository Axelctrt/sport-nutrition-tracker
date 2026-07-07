import type {
  SocialActivityCloudFeedCard,
  SocialActivityCloudFeedPage,
  SocialActivityFeedOwnerProfile,
} from '@/domain/friends/socialActivityCloudFeed';
import type {
  ActiveSocialActivitySnapshot,
} from '@/domain/friends/socialActivitySnapshotContract';
import { validateSocialActivitySnapshotV2 } from '@/domain/friends/socialActivitySnapshotValidation';
import type { SocialActivitySnapshotCloudCredentials } from '@/infrastructure/social-activity-snapshots/socialActivitySnapshotCloudGateway';

export class SocialActivityFeedCloudError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable: boolean) {
    super(message);
    this.name = 'SocialActivityFeedCloudError';
    this.code = code;
    this.retryable = retryable;
  }
}

export interface SocialActivityFeedCloudGateway {
  readonly listPage: (
    credentials: SocialActivitySnapshotCloudCredentials,
    input?: { readonly cursor?: string; readonly limit?: number },
  ) => Promise<SocialActivityCloudFeedPage>;
  readonly readDetail: (
    credentials: SocialActivitySnapshotCloudCredentials,
    snapshotId: string,
  ) => Promise<ActiveSocialActivitySnapshot>;
}

interface SocialActivityFeedCloudGatewayOptions {
  readonly feedEndpoint?: string;
  readonly detailEndpoint?: string;
  readonly fetcher?: typeof fetch;
}

function normalizeEndpoint(value: string | undefined, fallback: string): string {
  return (value?.trim() || fallback).replace(/\/$/u, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

async function readPayload(response: Response): Promise<Record<string, unknown>> {
  try {
    const value = await response.json();
    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
}

function readMessage(payload: Record<string, unknown>, fallback: string): string {
  return typeof payload.message === 'string' && payload.message.trim()
    ? payload.message
    : fallback;
}

function readCode(payload: Record<string, unknown>, fallback: string): string {
  return typeof payload.code === 'string' && payload.code.trim()
    ? payload.code
    : fallback;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function assertCredentials(credentials: SocialActivitySnapshotCloudCredentials): void {
  if (!credentials.userId.trim() || !credentials.accessToken.trim()) {
    throw new SocialActivityFeedCloudError(
      'Connecte ton compte SportPilot pour charger le fil d’activité.',
      'social_activity_feed_auth_missing',
      false,
    );
  }
}

function parseOwnerProfile(value: unknown, ownerUserId: string): SocialActivityFeedOwnerProfile {
  if (!isRecord(value)) return { userId: ownerUserId };
  const userId = typeof value.userId === 'string' && value.userId.trim()
    ? value.userId
    : ownerUserId;
  return {
    userId,
    ...(typeof value.handle === 'string' && value.handle.trim() ? { handle: value.handle.trim() } : {}),
    ...(typeof value.displayName === 'string' && value.displayName.trim()
      ? { displayName: value.displayName.trim() }
      : {}),
  };
}

function parseFeedCard(value: unknown): SocialActivityCloudFeedCard {
  if (!isRecord(value)) {
    throw new SocialActivityFeedCloudError(
      'Carte d’activité sociale invalide.',
      'social_activity_feed_invalid_response',
      true,
    );
  }
  const { detailAvailable, ownerProfile, ...snapshotCandidate } = value;
  const validationCandidate = snapshotCandidate.visibility === 'detailed'
    && detailAvailable === true
    && (snapshotCandidate.family === 'cardio'
      || snapshotCandidate.family === 'strength'
      || snapshotCandidate.family === 'generic')
    ? { ...snapshotCandidate, detail: { family: snapshotCandidate.family } }
    : snapshotCandidate;
  const validation = validateSocialActivitySnapshotV2(validationCandidate);
  if (!validation.valid || snapshotCandidate.state !== 'active') {
    throw new SocialActivityFeedCloudError(
      'Carte d’activité sociale invalide.',
      'social_activity_feed_invalid_response',
      true,
    );
  }
  return {
    ...(snapshotCandidate as unknown as ActiveSocialActivitySnapshot),
    detailAvailable: detailAvailable === true,
    ownerProfile: parseOwnerProfile(ownerProfile, String(snapshotCandidate.ownerUserId)),
  };
}

function parseDetail(value: unknown): ActiveSocialActivitySnapshot {
  const validation = validateSocialActivitySnapshotV2(value);
  if (!validation.valid || !isRecord(value) || value.state !== 'active') {
    throw new SocialActivityFeedCloudError(
      'Détail social invalide.',
      'social_activity_detail_invalid_response',
      true,
    );
  }
  return value as unknown as ActiveSocialActivitySnapshot;
}

async function executeRequest(
  fetcher: typeof fetch,
  url: string,
  credentials: SocialActivitySnapshotCloudCredentials,
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${credentials.accessToken}`,
      },
    });
  } catch {
    throw new SocialActivityFeedCloudError(
      'Fil d’activité indisponible hors ligne.',
      'social_activity_feed_network_error',
      true,
    );
  }
  const payload = await readPayload(response);
  if (!response.ok) {
    throw new SocialActivityFeedCloudError(
      readMessage(payload, 'Le fil d’activité n’a pas pu être chargé.'),
      readCode(payload, `social_activity_feed_http_${response.status}`),
      isRetryableStatus(response.status),
    );
  }
  return payload;
}

export function createSocialActivityFeedCloudGateway(
  options: SocialActivityFeedCloudGatewayOptions = {},
): SocialActivityFeedCloudGateway {
  const feedEndpoint = normalizeEndpoint(options.feedEndpoint, '/api/social-activity-feed');
  const detailEndpoint = normalizeEndpoint(
    options.detailEndpoint,
    '/api/social-activity-snapshots/detail',
  );
  const fetcher = options.fetcher ?? fetch;

  return {
    async listPage(credentials, input = {}) {
      assertCredentials(credentials);
      const search = new URLSearchParams();
      search.set('limit', String(input.limit ?? 10));
      if (input.cursor) search.set('cursor', input.cursor);
      const payload = await executeRequest(
        fetcher,
        `${feedEndpoint}?${search.toString()}`,
        credentials,
      );
      if (!Array.isArray(payload.items)) {
        throw new SocialActivityFeedCloudError(
          'Réponse du fil d’activité invalide.',
          'social_activity_feed_invalid_response',
          true,
        );
      }
      const items = payload.items.map(parseFeedCard);
      const nextCursor = typeof payload.nextCursor === 'string' && payload.nextCursor.trim()
        ? payload.nextCursor
        : undefined;
      return {
        items,
        ...(nextCursor ? { nextCursor } : {}),
      };
    },

    async readDetail(credentials, snapshotId) {
      assertCredentials(credentials);
      if (!snapshotId.trim()) {
        throw new SocialActivityFeedCloudError(
          'Identifiant de snapshot social manquant.',
          'social_activity_detail_id_missing',
          false,
        );
      }
      const search = new URLSearchParams({ snapshotId });
      const payload = await executeRequest(
        fetcher,
        `${detailEndpoint}?${search.toString()}`,
        credentials,
      );
      return parseDetail(payload.snapshot);
    },
  };
}
