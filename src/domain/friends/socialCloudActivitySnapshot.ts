import type { EntityId, IsoDateTime } from '@/domain/models/common';
import { normalizeFriendHandle } from '@/domain/friends/friendship';
import type { SocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshot';

export const SOCIAL_CLOUD_ACTIVITY_SNAPSHOT_CONTRACT_VERSION = '0.28.0-f6' as const;

export const SOCIAL_CLOUD_ACTIVITY_SNAPSHOT_FORBIDDEN_BEHAVIORS = [
  'rawActivityExport',
  'rawActivityCloudWrite',
  'activityNotesSync',
  'publicSuggestions',
  'globalUserDirectory',
  'likes',
  'comments',
  'messaging',
  'groups',
  'leaderboards',
] as const;

export type SocialCloudActivitySnapshotForbiddenBehavior =
  (typeof SOCIAL_CLOUD_ACTIVITY_SNAPSHOT_FORBIDDEN_BEHAVIORS)[number];

export type CloudSocialActivitySnapshotRecord = SocialActivitySnapshot & {
  readonly ownerUserId: EntityId;
  readonly publishedForUserId: EntityId;
  readonly sourceSnapshotId: EntityId;
  readonly publishedAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
  readonly rawActivityShared: false;
};

export interface SocialCloudActivitySnapshotPublicationReport {
  readonly ownerUserId: EntityId;
  readonly publishedCount: number;
  readonly summaryCount: number;
  readonly detailedCount: number;
  readonly rawActivityShared: false;
  readonly relationshipKey: 'userId';
}

export function createCloudSocialActivitySnapshotId(
  ownerUserId: EntityId,
  publishedForUserId: EntityId,
  sourceSnapshotId: EntityId,
): EntityId {
  return `cloud-social-snapshot:${ownerUserId}->${publishedForUserId}:${sourceSnapshotId}` as EntityId;
}

function assertFilteredSnapshot(snapshot: SocialActivitySnapshot): void {
  const candidate = snapshot as unknown as Record<string, unknown>;
  for (const forbidden of ['notes', 'description', 'startedAt', 'endedAt', 'route', 'sets', 'rawActivity']) {
    if (forbidden in candidate) {
      throw new Error(`Un snapshot social cloud ne doit pas contenir ${forbidden}.`);
    }
  }
}

export function buildCloudSocialActivitySnapshotRecord(
  ownerUserId: EntityId,
  snapshot: SocialActivitySnapshot,
  now: IsoDateTime = new Date().toISOString(),
): CloudSocialActivitySnapshotRecord {
  assertFilteredSnapshot(snapshot);
  const publishedForUserId = snapshot.friendId as EntityId;

  return {
    ...snapshot,
    id: createCloudSocialActivitySnapshotId(ownerUserId, publishedForUserId, snapshot.id),
    ownerUserId,
    publishedForUserId,
    sourceSnapshotId: snapshot.id,
    friendHandle: normalizeFriendHandle(snapshot.friendHandle),
    publishedAt: now,
    updatedAt: now,
    rawActivityShared: false,
  };
}

export function buildCloudSocialActivitySnapshotRecords(
  ownerUserId: EntityId,
  snapshots: readonly SocialActivitySnapshot[],
  now: IsoDateTime = new Date().toISOString(),
): readonly CloudSocialActivitySnapshotRecord[] {
  return snapshots.map((snapshot) => buildCloudSocialActivitySnapshotRecord(ownerUserId, snapshot, now));
}

export function summarizeCloudSocialActivitySnapshotPublication(
  ownerUserId: EntityId,
  records: readonly CloudSocialActivitySnapshotRecord[],
): SocialCloudActivitySnapshotPublicationReport {
  return {
    ownerUserId,
    publishedCount: records.length,
    summaryCount: records.filter((record) => record.scope === 'summary').length,
    detailedCount: records.filter((record) => record.scope === 'detailed').length,
    rawActivityShared: false,
    relationshipKey: 'userId',
  };
}

export function cloudSocialActivitySnapshotRecordToFeedSnapshot(
  record: CloudSocialActivitySnapshotRecord,
): SocialActivitySnapshot {
  const {
    ownerUserId,
    publishedForUserId: _publishedForUserId,
    sourceSnapshotId,
    publishedAt: _publishedAt,
    updatedAt: _updatedAt,
    rawActivityShared: _rawActivityShared,
    ...snapshot
  } = record;

  return {
    ...snapshot,
    id: sourceSnapshotId,
    friendId: ownerUserId,
  };
}

export function filterCloudSocialActivitySnapshotsForFeed(
  userId: EntityId,
  records: readonly CloudSocialActivitySnapshotRecord[],
): readonly SocialActivitySnapshot[] {
  return records
    .filter((record) => record.publishedForUserId === userId && record.rawActivityShared === false)
    .map(cloudSocialActivitySnapshotRecordToFeedSnapshot);
}

export function assertSocialCloudActivitySnapshotContractIntegrity(): true {
  for (const forbidden of [
    'rawActivityExport',
    'rawActivityCloudWrite',
    'globalUserDirectory',
    'messaging',
  ] as const) {
    if (!SOCIAL_CLOUD_ACTIVITY_SNAPSHOT_FORBIDDEN_BEHAVIORS.includes(forbidden)) {
      throw new Error(`Les snapshots sociaux cloud doivent interdire ${forbidden}.`);
    }
  }

  const source: SocialActivitySnapshot = {
    id: 'social-activity-snapshot:activity:run-1:friend:social-user:lina:summary' as EntityId,
    sourceActivityId: 'activity:run-1' as EntityId,
    friendId: 'social-user:lina' as EntityId,
    friendHandle: 'lina.trail',
    scope: 'summary',
    activityType: 'running',
    date: '2026-07-05',
    durationMinutes: 42,
    intensity: 'moderate',
    estimatedCaloriesKcal: 420,
    metrics: { distanceKm: 8.2 },
    createdAt: '2026-07-05T08:00:00.000Z',
    guardReason: 'Résumé filtré autorisé.',
  };

  const record = buildCloudSocialActivitySnapshotRecord(
    'social-user:alex' as EntityId,
    source,
    '2026-07-05T09:00:00.000Z',
  );
  const feedSnapshot = filterCloudSocialActivitySnapshotsForFeed('social-user:lina' as EntityId, [record])[0];

  if (!feedSnapshot || feedSnapshot.friendId !== 'social-user:alex') {
    throw new Error('Un snapshot entrant doit être rattaché au ownerUserId distant pour le feed.');
  }

  if (record.rawActivityShared !== false) {
    throw new Error('Un snapshot social cloud ne doit jamais exposer une activité brute.');
  }

  return true;
}
