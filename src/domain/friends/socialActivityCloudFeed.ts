import type { ActiveSocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshotContract';

export interface SocialActivityFeedOwnerProfile {
  readonly userId: string;
  readonly handle?: string;
  readonly displayName?: string;
}

export interface SocialActivityCloudFeedCard
  extends Omit<ActiveSocialActivitySnapshot, 'detail'> {
  readonly detailAvailable: boolean;
  readonly ownerProfile: SocialActivityFeedOwnerProfile;
}

export interface SocialActivityCloudFeedPage {
  readonly items: readonly SocialActivityCloudFeedCard[];
  readonly nextCursor?: string;
}

export type SocialActivityCloudReadinessStatus =
  | 'ready'
  | 'migrationRequired'
  | 'prerequisiteMissing';

export interface SocialActivityCloudReadiness {
  readonly status: SocialActivityCloudReadinessStatus;
  readonly contractVersion: string;
  readonly authVerified: boolean;
  readonly databaseBound: boolean;
  readonly requiredMigration: string;
  readonly missingPrerequisites: readonly string[];
  readonly missingActivitySchema: readonly string[];
  readonly checkedAt: string;
}

function parseTimestamp(value: string | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

function cardOccurredTimestamp(card: SocialActivityCloudFeedCard): number {
  if (card.occurredAt) return parseTimestamp(card.occurredAt);
  const time = card.occurredTime ? `${card.occurredTime}:00` : '00:00:00';
  return parseTimestamp(`${card.occurredOn}T${time}`);
}

function compareTextDescending(left: string, right: string): number {
  return right.localeCompare(left);
}

export function compareSocialActivityFeedCards(
  left: SocialActivityCloudFeedCard,
  right: SocialActivityCloudFeedCard,
): number {
  const occurredDifference = cardOccurredTimestamp(right) - cardOccurredTimestamp(left);
  if (occurredDifference !== 0) return occurredDifference;

  const createdDifference = parseTimestamp(right.createdAt) - parseTimestamp(left.createdAt);
  if (createdDifference !== 0) return createdDifference;

  return compareTextDescending(left.snapshotId, right.snapshotId);
}

function preferIncomingCard(
  current: SocialActivityCloudFeedCard,
  incoming: SocialActivityCloudFeedCard,
): SocialActivityCloudFeedCard {
  const currentUpdatedAt = parseTimestamp(current.updatedAt);
  const incomingUpdatedAt = parseTimestamp(incoming.updatedAt);
  if (incomingUpdatedAt !== currentUpdatedAt) {
    return incomingUpdatedAt > currentUpdatedAt ? incoming : current;
  }
  if (incoming.sourceRevision !== current.sourceRevision) {
    return incoming.sourceRevision.localeCompare(current.sourceRevision) >= 0 ? incoming : current;
  }
  return incoming;
}

export function normalizeSocialActivityFeedCards(
  cards: readonly SocialActivityCloudFeedCard[],
): readonly SocialActivityCloudFeedCard[] {
  const bySnapshotId = new Map<string, SocialActivityCloudFeedCard>();
  for (const card of cards) {
    const current = bySnapshotId.get(card.snapshotId);
    bySnapshotId.set(
      card.snapshotId,
      current ? preferIncomingCard(current, card) : card,
    );
  }
  return [...bySnapshotId.values()].sort(compareSocialActivityFeedCards);
}

export function socialActivityFeedCardsHaveSameVisibleRevision(
  left: SocialActivityCloudFeedCard,
  right: SocialActivityCloudFeedCard,
): boolean {
  return left.snapshotId === right.snapshotId
    && left.sourceRevision === right.sourceRevision
    && left.updatedAt === right.updatedAt
    && left.visibility === right.visibility
    && left.detailAvailable === right.detailAvailable
    && left.title === right.title
    && JSON.stringify(left.allowedFields) === JSON.stringify(right.allowedFields)
    && JSON.stringify(left.summary) === JSON.stringify(right.summary);
}

export function socialActivityDetailMatchesFeedCard(
  card: SocialActivityCloudFeedCard,
  snapshot: ActiveSocialActivitySnapshot,
): boolean {
  return snapshot.snapshotId === card.snapshotId
    && snapshot.contractVersion === card.contractVersion
    && snapshot.ownerUserId === card.ownerUserId
    && snapshot.recipientUserId === card.recipientUserId
    && snapshot.sourceKind === card.sourceKind
    && snapshot.sourceActivityId === card.sourceActivityId
    && snapshot.sourceRevision === card.sourceRevision
    && snapshot.updatedAt === card.updatedAt
    && snapshot.visibility === card.visibility
    && snapshot.family === card.family
    && snapshot.activityType === card.activityType
    && JSON.stringify(snapshot.allowedFields) === JSON.stringify(card.allowedFields);
}
