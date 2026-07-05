import type { EntityId } from '@/domain/models/common';
import type { SocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshot';
import {
  assertSocialCloudActivitySnapshotContractIntegrity,
  buildCloudSocialActivitySnapshotRecord,
  buildCloudSocialActivitySnapshotRecords,
  cloudSocialActivitySnapshotRecordToFeedSnapshot,
  filterCloudSocialActivitySnapshotsForFeed,
  summarizeCloudSocialActivitySnapshotPublication,
} from '@/domain/friends/socialCloudActivitySnapshot';

const summarySnapshot: SocialActivitySnapshot = {
  id: 'social-activity-snapshot:activity:run-1:friend:social-user:lina:summary' as EntityId,
  sourceActivityId: 'activity:run-1' as EntityId,
  friendId: 'social-user:lina' as EntityId,
  friendHandle: 'Lina.Trail',
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

const detailedSnapshot: SocialActivitySnapshot = {
  ...summarySnapshot,
  id: 'social-activity-snapshot:activity:run-1:friend:social-user:lina:detailed' as EntityId,
  scope: 'detailed',
  metrics: {
    distanceKm: 8.2,
    elevationGainMeters: 120,
    sessionType: 'endurance',
    terrainType: 'trail',
  },
};

describe('socialCloudActivitySnapshot', () => {
  it('publie un snapshot filtré pour un userId destinataire sans activité brute', () => {
    const record = buildCloudSocialActivitySnapshotRecord(
      'social-user:alex' as EntityId,
      summarySnapshot,
      '2026-07-05T09:00:00.000Z',
    );

    expect(record).toMatchObject({
      ownerUserId: 'social-user:alex',
      publishedForUserId: 'social-user:lina',
      sourceSnapshotId: summarySnapshot.id,
      friendHandle: 'lina.trail',
      rawActivityShared: false,
    });
    expect(record).not.toHaveProperty('notes');
    expect(record).not.toHaveProperty('rawActivity');
  });

  it('refuse un snapshot qui tenterait de transporter une donnée brute', () => {
    expect(() => buildCloudSocialActivitySnapshotRecord(
      'social-user:alex' as EntityId,
      { ...summarySnapshot, notes: 'trop privé' } as unknown as SocialActivitySnapshot,
    )).toThrow('notes');
  });

  it('convertit un snapshot entrant pour rattacher le feed au ownerUserId distant', () => {
    const record = buildCloudSocialActivitySnapshotRecord('social-user:alex' as EntityId, summarySnapshot);

    const feedSnapshot = cloudSocialActivitySnapshotRecordToFeedSnapshot(record);

    expect(feedSnapshot.friendId).toBe('social-user:alex');
    expect(feedSnapshot.id).toBe(summarySnapshot.id);
    expect(feedSnapshot.scope).toBe('summary');
  });

  it('filtre les snapshots entrants par destinataire cloud', () => {
    const records = buildCloudSocialActivitySnapshotRecords('social-user:alex' as EntityId, [summarySnapshot, detailedSnapshot]);

    expect(filterCloudSocialActivitySnapshotsForFeed('social-user:lina' as EntityId, records)).toHaveLength(2);
    expect(filterCloudSocialActivitySnapshotsForFeed('social-user:zoe' as EntityId, records)).toHaveLength(0);
  });

  it('résume une publication sans exposer d’activité brute', () => {
    const records = buildCloudSocialActivitySnapshotRecords('social-user:alex' as EntityId, [summarySnapshot, detailedSnapshot]);

    expect(summarizeCloudSocialActivitySnapshotPublication('social-user:alex' as EntityId, records)).toEqual({
      ownerUserId: 'social-user:alex',
      publishedCount: 2,
      summaryCount: 1,
      detailedCount: 1,
      rawActivityShared: false,
      relationshipKey: 'userId',
    });
  });

  it('valide l’intégrité du contrat F6', () => {
    expect(assertSocialCloudActivitySnapshotContractIntegrity()).toBe(true);
  });
});
