import type { EntityId } from '@/domain/models/common';
import { createActiveSocialActivitySnapshotV2 } from '@/domain/friends/socialActivitySnapshotFactory';
import { createSocialActivityFeedCloudGateway } from '@/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway';

const credentials = {
  userId: 'friend-user',
  accessToken: 'secret-token',
};

const summarySnapshot = createActiveSocialActivitySnapshotV2({
  ownerUserId: 'owner-user' as EntityId,
  recipientUserId: credentials.userId as EntityId,
  sourceKind: 'activity',
  sourceActivityId: 'activity-1' as EntityId,
  sourceRevision: 'revision-1',
  visibility: 'summary',
  family: 'cardio',
  activityType: 'running',
  title: 'Course du matin',
  occurredOn: '2026-07-07',
  allowedFields: {
    common: ['activityType', 'title', 'date', 'duration'],
    cardio: ['distance'],
    strength: [],
  },
  summary: {
    durationMinutes: 42,
    distanceKm: 8,
  },
  createdAt: '2026-07-07T08:00:00.000Z',
  updatedAt: '2026-07-07T08:00:00.000Z',
});

const detailedSnapshot = createActiveSocialActivitySnapshotV2({
  ownerUserId: 'owner-user' as EntityId,
  recipientUserId: credentials.userId as EntityId,
  sourceKind: 'strengthSession',
  sourceActivityId: 'session-1' as EntityId,
  sourceRevision: 'revision-2',
  visibility: 'detailed',
  family: 'strength',
  activityType: 'strengthTraining',
  title: 'Séance haut du corps',
  occurredOn: '2026-07-08',
  occurredTime: '18:30',
  allowedFields: {
    common: ['activityType', 'title', 'date', 'time', 'duration'],
    cardio: [],
    strength: ['sessionName', 'exerciseCount', 'exercises', 'sets', 'repetitions'],
  },
  summary: {
    durationMinutes: 60,
    exerciseCount: 1,
  },
  detail: {
    family: 'strength',
    sessionName: 'Haut du corps',
    exercises: [{
      name: 'Développé couché',
      sets: [{ setNumber: 1, repetitions: 10 }],
    }],
  },
  createdAt: '2026-07-08T18:30:00.000Z',
  updatedAt: '2026-07-08T18:30:00.000Z',
});

describe('socialActivityFeedCloudGateway', () => {
  it('charge une page authentifiée et valide les cartes sans détail brut', async () => {
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toContain('/api/social-activity-feed?limit=10');
      expect(init?.headers).toMatchObject({ authorization: 'Bearer secret-token' });
      return new Response(JSON.stringify({
        status: 'found',
        items: [{
          ...summarySnapshot,
          detailAvailable: false,
          ownerProfile: {
            userId: 'owner-user',
            handle: 'alex.run',
            displayName: 'Alex Run',
          },
        }],
        nextCursor: 'cursor-2',
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const gateway = createSocialActivityFeedCloudGateway({ fetcher });

    await expect(gateway.listPage(credentials)).resolves.toMatchObject({
      nextCursor: 'cursor-2',
      items: [{
        snapshotId: summarySnapshot.snapshotId,
        detailAvailable: false,
        ownerProfile: { handle: 'alex.run', displayName: 'Alex Run' },
      }],
    });
  });

  it('accepte une carte détaillée sans exposer son bloc de détail dans le fil', async () => {
    const { detail: _detail, ...cardSnapshot } = detailedSnapshot;
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      status: 'found',
      items: [{
        ...cardSnapshot,
        detailAvailable: true,
        ownerProfile: { userId: 'owner-user' },
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const gateway = createSocialActivityFeedCloudGateway({ fetcher });

    await expect(gateway.listPage(credentials)).resolves.toMatchObject({
      items: [{
        snapshotId: detailedSnapshot.snapshotId,
        visibility: 'detailed',
        detailAvailable: true,
      }],
    });
  });

  it('accepte une carte détaillée sans détail disponible après filtrage granulaire', async () => {
    const { detail: _detail, ...cardSnapshot } = detailedSnapshot;
    const cardioCard = {
      ...cardSnapshot,
      sourceKind: 'activity' as const,
      sourceActivityId: 'activity-2' as EntityId,
      snapshotId: 'social-activity-snapshot-v2:owner-user:activity:activity-2:friend-user' as EntityId,
      family: 'cardio' as const,
      activityType: 'running' as const,
      visibility: 'detailed' as const,
      occurredTime: undefined,
      allowedFields: {
        common: ['activityType', 'title', 'date', 'duration'],
        cardio: ['distance', 'pace', 'speed', 'elevation'],
        strength: [],
      },
      summary: {
        durationMinutes: 45,
        distanceKm: 8,
        paceMinutesPerKm: 5.625,
      },
    };
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      status: 'found',
      items: [{
        ...cardioCard,
        detailAvailable: false,
        ownerProfile: { userId: 'owner-user' },
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const gateway = createSocialActivityFeedCloudGateway({ fetcher });

    await expect(gateway.listPage(credentials)).resolves.toMatchObject({
      items: [{
        snapshotId: cardioCard.snapshotId,
        visibility: 'detailed',
        detailAvailable: false,
      }],
    });
  });

  it('lit l’état d’activation D1 authentifié', async () => {
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe('/api/social-activity-snapshots/readiness');
      expect(init?.headers).toMatchObject({ authorization: 'Bearer secret-token' });
      return new Response(JSON.stringify({
        status: 'migrationRequired',
        contractVersion: '0.29.0-a3',
        authVerified: true,
        databaseBound: true,
        requiredMigration: '0001_social_activity_snapshots_0_29_0.sql',
        missingPrerequisites: [],
        missingActivitySchema: ['social_activity_snapshots'],
        checkedAt: '2026-07-07T18:00:00.000Z',
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const gateway = createSocialActivityFeedCloudGateway({ fetcher });

    await expect(gateway.readReadiness(credentials)).resolves.toMatchObject({
      status: 'migrationRequired',
      authVerified: true,
      missingActivitySchema: ['social_activity_snapshots'],
    });
  });

  it('charge le détail autorisé sur la route dédiée', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      status: 'found',
      snapshot: detailedSnapshot,
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const gateway = createSocialActivityFeedCloudGateway({ fetcher });

    await expect(gateway.readDetail(credentials, detailedSnapshot.snapshotId)).resolves.toMatchObject({
      snapshotId: detailedSnapshot.snapshotId,
      detail: {
        family: 'strength',
        exercises: [{ name: 'Développé couché' }],
      },
    });
  });

  it('charge aussi une fiche limitée au résumé', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      status: 'found',
      snapshot: summarySnapshot,
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const gateway = createSocialActivityFeedCloudGateway({ fetcher });

    await expect(gateway.readDetail(credentials, summarySnapshot.snapshotId)).resolves.toMatchObject({
      snapshotId: summarySnapshot.snapshotId,
      visibility: 'summary',
      summary: { durationMinutes: 42, distanceKm: 8 },
    });
  });

  it('rejette une fiche qui ne correspond pas à l’identifiant demandé', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      status: 'found',
      snapshot: detailedSnapshot,
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const gateway = createSocialActivityFeedCloudGateway({ fetcher });

    await expect(gateway.readDetail(credentials, 'another-snapshot-id')).rejects.toMatchObject({
      code: 'social_activity_detail_identity_mismatch',
      retryable: false,
    });
  });

  it('classe une panne réseau comme réessayable et rejette une réponse corrompue', async () => {
    const offlineGateway = createSocialActivityFeedCloudGateway({
      fetcher: vi.fn(async () => { throw new TypeError('offline'); }),
    });
    await expect(offlineGateway.listPage(credentials)).rejects.toMatchObject({
      code: 'social_activity_feed_network_error',
      retryable: true,
    });

    const invalidGateway = createSocialActivityFeedCloudGateway({
      fetcher: vi.fn(async () => new Response(JSON.stringify({ items: [{ state: 'active' }] }), { status: 200 })),
    });
    await expect(invalidGateway.listPage(credentials)).rejects.toMatchObject({
      code: 'social_activity_feed_invalid_response',
    });
  });
});
