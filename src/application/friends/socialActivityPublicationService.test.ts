import {
  reconcileCompletedStrengthSessionSocialSnapshots,
  reconcileStoredActivitySocialSnapshots,
  removePublishedSocialActivitySnapshots,
  socialActivityGlobalPolicyFromFriendsPrivacy,
  type SocialActivitySnapshotPublicationRepository,
} from '@/application/friends/socialActivityPublicationService';
import {
  DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION,
  type SocialActivityFieldSelection,
  type SocialActivityGlobalSharingPolicy,
} from '@/domain/friends/socialActivitySharingPolicy';
import type { SocialActivitySnapshotOutboxRecord } from '@/domain/friends/socialActivitySnapshotOutbox';
import {
  createFriendActivityPermissionId,
  type FriendProfileSummary,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import type { SocialIdentity } from '@/domain/friends/socialIdentity';
import type { StrengthTrainingActivity } from '@/domain/models/activity';
import type { EntityId } from '@/domain/models/common';
import type {
  ExerciseDefinition,
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
} from '@/domain/models/strength';
import { createEntity } from '@/shared/utils/entities';
import { createRunningActivityInput } from '@/test/factories/activityFactory';
import {
  createExerciseDefinitionInput,
  createStrengthSetInput,
  createWorkoutSessionExerciseInput,
  createWorkoutSessionInput,
} from '@/test/factories/strengthFactory';

class MemoryPublicationRepository implements SocialActivitySnapshotPublicationRepository {
  readonly records = new Map<EntityId, SocialActivitySnapshotOutboxRecord>();

  async get(snapshotId: EntityId) {
    return this.records.get(snapshotId);
  }

  async put(record: SocialActivitySnapshotOutboxRecord) {
    this.records.set(record.id, record);
  }

  async listBySource(input: {
    readonly ownerUserId: EntityId;
    readonly sourceKind: SocialActivitySnapshotOutboxRecord['sourceKind'];
    readonly sourceActivityId: EntityId;
  }) {
    return [...this.records.values()].filter((record) => (
      record.ownerUserId === input.ownerUserId
      && record.sourceKind === input.sourceKind
      && record.sourceActivityId === input.sourceActivityId
    ));
  }
}

const identity: SocialIdentity = {
  userId: 'owner-user',
  handle: 'owner.run',
  displayName: 'Owner Run',
  createdAt: '2026-07-07T08:00:00.000Z',
  updatedAt: '2026-07-07T08:00:00.000Z',
};

function friend(userId: EntityId, handle: string): FriendProfileSummary {
  return {
    id: userId,
    userId,
    displayName: handle,
    handle,
    initials: handle.slice(0, 2).toUpperCase(),
  };
}

function privacySnapshot(input: {
  readonly sharing?: FriendsPrivacySnapshot['privacy']['activitySharing'];
  readonly profileVisibility?: FriendsPrivacySnapshot['privacy']['profileVisibility'];
  readonly policy?: SocialActivityGlobalSharingPolicy;
  readonly friends?: readonly FriendProfileSummary[];
  readonly detailedFriendIds?: readonly EntityId[];
  readonly fieldSelectionByFriendId?: Readonly<Record<string, SocialActivityFieldSelection>>;
} = {}): FriendsPrivacySnapshot {
  const friends = input.friends ?? [friend('friend-summary', 'summary.friend')];
  const detailedFriendIds = new Set(input.detailedFriendIds ?? []);

  return {
    friends,
    requests: [],
    privacy: {
      profileVisibility: input.profileVisibility ?? 'friends',
      activitySharing: input.sharing ?? 'summary-only',
      ...(input.policy ? { socialActivitySharingPolicy: input.policy } : {}),
      allowFriendRequests: true,
      requireManualApproval: true,
    },
    activityPermissions: friends.map((candidate) => ({
      id: createFriendActivityPermissionId(candidate),
      ...(candidate.userId ? { friendUserId: candidate.userId } : {}),
      friendHandle: candidate.handle,
      sharingLevel: detailedFriendIds.has(candidate.userId ?? candidate.id)
        ? 'detailed'
        : 'summary',
      detailedConsent: detailedFriendIds.has(candidate.userId ?? candidate.id)
        ? 'granted'
        : 'notRequested',
      ...(detailedFriendIds.has(candidate.userId ?? candidate.id)
        ? { detailedConsentGrantedAt: '2026-07-07T09:00:00.000Z' }
        : {}),
      fieldSelection: input.fieldSelectionByFriendId?.[candidate.userId ?? candidate.id]
        ?? DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION,
    })),
  };
}

function runningActivity() {
  return {
    ...createEntity(
      createRunningActivityInput({
        date: '2026-07-07',
        durationMinutes: 50,
        distanceKm: 8,
        notes: 'Note privée',
      }),
      'activity-run',
      '2026-07-07T10:00:00.000Z',
    ),
    updatedAt: '2026-07-07T10:30:00.000Z',
  };
}

function completedStrengthFixture(): {
  readonly session: WorkoutSession;
  readonly exercises: readonly WorkoutSessionExercise[];
  readonly sets: readonly StrengthSet[];
  readonly definitions: readonly ExerciseDefinition[];
} {
  const session = {
    ...createEntity<WorkoutSession>(
      createWorkoutSessionInput({
        status: 'completed',
        completedAt: '2026-07-07T18:00:00.000Z',
        durationMinutes: 60,
        sourceTemplateNameSnapshot: 'Push',
      }),
      'session-push',
      '2026-07-07T17:00:00.000Z',
    ),
    updatedAt: '2026-07-07T18:00:00.000Z',
  };
  const exercise = createEntity<WorkoutSessionExercise>(
    createWorkoutSessionExerciseInput({
      sessionId: session.id,
      exerciseDefinitionId: 'definition-bench',
      exerciseNameSnapshot: 'Développé couché',
      loadUnitSnapshot: 'kg',
      trackingModeSnapshot: 'loadRepetitions',
    }),
    'session-exercise-bench',
    '2026-07-07T17:05:00.000Z',
  );
  const set = createEntity<StrengthSet>(
    createStrengthSetInput({
      sessionId: session.id,
      sessionExerciseId: exercise.id,
      repetitions: 10,
      weightKg: 60,
    }),
    'set-bench',
    '2026-07-07T17:30:00.000Z',
  );
  const definition = createEntity<ExerciseDefinition>(
    createExerciseDefinitionInput({
      name: 'Développé couché',
      primaryMuscleGroup: 'pectorals',
    }),
    'definition-bench',
    '2026-07-01T10:00:00.000Z',
  );

  return {
    session,
    exercises: [exercise],
    sets: [set],
    definitions: [definition],
  };
}

describe('social activity publication service', () => {
  it('traduit les réglages amis historiques vers le contrat 0.29 sans élargissement', () => {
    expect(socialActivityGlobalPolicyFromFriendsPrivacy(
      privacySnapshot({ sharing: 'summary-only' }),
    ).visibility).toBe('summary');
    expect(socialActivityGlobalPolicyFromFriendsPrivacy(
      privacySnapshot({ sharing: 'detailed' }),
    ).visibility).toBe('detailed');
    expect(socialActivityGlobalPolicyFromFriendsPrivacy(
      privacySnapshot({ sharing: 'disabled' }),
    ).visibility).toBe('private');
  });

  it('respecte une surcharge activité même si le champ historique reste désactivé', async () => {
    const repository = new MemoryPublicationRepository();
    const activity = {
      ...runningActivity(),
      socialSharing: { mode: 'summary' as const },
    };

    const report = await reconcileStoredActivitySocialSnapshots({
      context: {
        identity,
        privacySnapshot: privacySnapshot({
          sharing: 'disabled',
          policy: {
            visibility: 'private',
            fields: DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION,
          },
        }),
        repository,
      },
      activity,
      stagedAt: '2026-07-07T11:00:00.000Z',
    });

    expect(report).toMatchObject({
      status: 'reconciled',
      activeSnapshotCount: 1,
      tombstoneCount: 0,
    });
    expect([...repository.records.values()][0]?.snapshot).toMatchObject({
      state: 'active',
      visibility: 'summary',
      sourceActivityId: activity.id,
    });
  });

  it('conserve le verrou du profil privé malgré une surcharge activité', async () => {
    const repository = new MemoryPublicationRepository();

    const report = await reconcileStoredActivitySocialSnapshots({
      context: {
        identity,
        privacySnapshot: privacySnapshot({
          sharing: 'disabled',
          profileVisibility: 'private',
          policy: {
            visibility: 'private',
            fields: DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION,
          },
        }),
        repository,
      },
      activity: {
        ...runningActivity(),
        socialSharing: { mode: 'detailed' },
      },
      stagedAt: '2026-07-07T11:00:00.000Z',
    });

    expect(report.activeSnapshotCount).toBe(0);
    expect(repository.records.size).toBe(0);
  });

  it('met en file un résumé par ami réel et ignore un contact local sans userId', async () => {
    const repository = new MemoryPublicationRepository();
    const localOnlyFriend: FriendProfileSummary = {
      id: 'friend-local',
      displayName: 'Local',
      handle: 'local.friend',
      initials: 'LF',
    };

    const report = await reconcileStoredActivitySocialSnapshots({
      context: {
        identity,
        privacySnapshot: privacySnapshot({
          friends: [friend('friend-summary', 'summary.friend'), localOnlyFriend],
        }),
        repository,
      },
      activity: runningActivity(),
      stagedAt: '2026-07-07T11:00:00.000Z',
    });

    expect(report).toMatchObject({
      status: 'reconciled',
      processedRecipientCount: 1,
      activeSnapshotCount: 1,
      skippedRecipientCount: 1,
    });
    const [record] = [...repository.records.values()];
    expect(record?.snapshot).toMatchObject({
      state: 'active',
      recipientUserId: 'friend-summary',
      visibility: 'summary',
    });
    expect(JSON.stringify(record?.snapshot)).not.toContain('Note privée');
  });

  it('applique la permission détaillée uniquement à l’ami ayant donné son consentement', async () => {
    const repository = new MemoryPublicationRepository();
    const friends = [
      friend('friend-summary', 'summary.friend'),
      friend('friend-detailed', 'detailed.friend'),
    ];

    await reconcileStoredActivitySocialSnapshots({
      context: {
        identity,
        privacySnapshot: privacySnapshot({
          sharing: 'detailed',
          friends,
          detailedFriendIds: ['friend-detailed'],
        }),
        repository,
      },
      activity: runningActivity(),
      stagedAt: '2026-07-07T11:00:00.000Z',
    });

    const records = [...repository.records.values()];
    expect(records.find((record) => record.recipientUserId === 'friend-summary')?.snapshot)
      .toMatchObject({ state: 'active', visibility: 'summary' });
    expect(records.find((record) => record.recipientUserId === 'friend-detailed')?.snapshot)
      .toMatchObject({ state: 'active', visibility: 'detailed', detail: { family: 'cardio' } });
  });

  it('projette des champs différents pour deux amis détaillés selon leur sélection', async () => {
    const repository = new MemoryPublicationRepository();
    const friends = [
      friend('friend-distance', 'distance.friend'),
      friend('friend-pace', 'pace.friend'),
    ];

    await reconcileStoredActivitySocialSnapshots({
      context: {
        identity,
        privacySnapshot: privacySnapshot({
          sharing: 'detailed',
          friends,
          detailedFriendIds: ['friend-distance', 'friend-pace'],
          fieldSelectionByFriendId: {
            'friend-distance': {
              common: ['activityType', 'date', 'duration'],
              cardio: ['distance'],
              strength: [],
            },
            'friend-pace': {
              common: ['activityType', 'title', 'date', 'duration'],
              cardio: ['distance', 'pace'],
              strength: [],
            },
          },
        }),
        repository,
      },
      activity: runningActivity(),
      stagedAt: '2026-07-07T11:00:00.000Z',
    });

    const records = [...repository.records.values()];
    const distanceSnapshot = records.find((record) => record.recipientUserId === 'friend-distance')?.snapshot;
    const paceSnapshot = records.find((record) => record.recipientUserId === 'friend-pace')?.snapshot;

    expect(distanceSnapshot).toMatchObject({
      state: 'active',
      allowedFields: {
        common: ['activityType', 'date', 'duration'],
        cardio: ['distance'],
        strength: [],
      },
    });
    expect(distanceSnapshot).not.toHaveProperty('title');
    expect(paceSnapshot).toMatchObject({
      state: 'active',
      allowedFields: {
        common: ['activityType', 'title', 'date', 'duration'],
        cardio: ['distance', 'pace'],
        strength: [],
      },
    });
  });

  it('remplace les snapshots existants par des tombstones si le partage est désactivé', async () => {
    const repository = new MemoryPublicationRepository();
    const activity = runningActivity();
    await reconcileStoredActivitySocialSnapshots({
      context: { identity, privacySnapshot: privacySnapshot(), repository },
      activity,
      stagedAt: '2026-07-07T11:00:00.000Z',
    });

    const report = await reconcileStoredActivitySocialSnapshots({
      context: {
        identity,
        privacySnapshot: privacySnapshot({ sharing: 'disabled' }),
        repository,
      },
      activity: { ...activity, updatedAt: '2026-07-07T11:05:00.000Z' },
      stagedAt: '2026-07-07T11:05:00.000Z',
    });

    expect(report.tombstoneCount).toBe(1);
    expect([...repository.records.values()][0]?.snapshot).toMatchObject({
      state: 'deleted',
      deletionReason: 'sharingDisabled',
    });
  });

  it('révoque un ancien destinataire absent de la liste actuelle', async () => {
    const repository = new MemoryPublicationRepository();
    const activity = runningActivity();
    await reconcileStoredActivitySocialSnapshots({
      context: { identity, privacySnapshot: privacySnapshot(), repository },
      activity,
      stagedAt: '2026-07-07T11:00:00.000Z',
    });

    await reconcileStoredActivitySocialSnapshots({
      context: {
        identity,
        privacySnapshot: privacySnapshot({ friends: [] }),
        repository,
      },
      activity: { ...activity, updatedAt: '2026-07-07T11:05:00.000Z' },
      stagedAt: '2026-07-07T11:05:00.000Z',
    });

    expect([...repository.records.values()][0]?.snapshot).toMatchObject({
      state: 'deleted',
      deletionReason: 'friendRevoked',
    });
  });

  it('supprime tous les snapshots déjà publiés même sans ami actuellement chargé', async () => {
    const repository = new MemoryPublicationRepository();
    const activity = runningActivity();
    await reconcileStoredActivitySocialSnapshots({
      context: { identity, privacySnapshot: privacySnapshot(), repository },
      activity,
      stagedAt: '2026-07-07T11:00:00.000Z',
    });

    const report = await removePublishedSocialActivitySnapshots({
      context: { identity, repository },
      sourceKind: 'activity',
      sourceActivityId: activity.id,
      stagedAt: '2026-07-07T11:10:00.000Z',
    });

    expect(report).toMatchObject({ processedRecipientCount: 1, tombstoneCount: 1 });
    expect([...repository.records.values()][0]?.snapshot).toMatchObject({
      state: 'deleted',
      deletionReason: 'sourceDeleted',
    });
  });

  it('projette une séance de musculation terminée vers la même file locale', async () => {
    const repository = new MemoryPublicationRepository();
    const fixture = completedStrengthFixture();

    const report = await reconcileCompletedStrengthSessionSocialSnapshots({
      context: {
        identity,
        privacySnapshot: privacySnapshot({
          sharing: 'detailed',
          detailedFriendIds: ['friend-summary'],
        }),
        repository,
      },
      session: fixture.session,
      exercises: fixture.exercises,
      sets: fixture.sets,
      exerciseDefinitions: fixture.definitions,
      stagedAt: '2026-07-07T18:05:00.000Z',
    });

    expect(report.activeSnapshotCount).toBe(1);
    expect([...repository.records.values()][0]?.snapshot).toMatchObject({
      state: 'active',
      family: 'strength',
      detail: {
        family: 'strength',
        exercises: [{ name: 'Développé couché', sets: [{ repetitions: 10, loadKg: 60 }] }],
      },
    });
  });

  it('ignore les activités génériques de musculation et les séances non terminées', async () => {
    const repository = new MemoryPublicationRepository();
    const activity = createEntity<StrengthTrainingActivity>({
      type: 'strengthTraining',
      date: '2026-07-07',
      durationMinutes: 60,
      intensity: 'moderate',
      met: 6,
      calculation: {
        weightKg: 60,
        estimatedCaloriesKcal: 360,
        calculationVersion: 1,
      },
    }, 'activity-strength');
    const fixture = completedStrengthFixture();

    await expect(reconcileStoredActivitySocialSnapshots({
      context: { identity, privacySnapshot: privacySnapshot(), repository },
      activity,
    })).resolves.toMatchObject({ status: 'unsupportedSource' });
    await expect(reconcileCompletedStrengthSessionSocialSnapshots({
      context: { identity, privacySnapshot: privacySnapshot(), repository },
      session: { ...fixture.session, status: 'inProgress' },
      exercises: fixture.exercises,
      sets: fixture.sets,
    })).resolves.toMatchObject({ status: 'unsupportedSource' });
    expect(repository.records.size).toBe(0);
  });

  it('applique la surcharge privée portée par une activité sans modifier le réglage global', async () => {
    const repository = new MemoryPublicationRepository();
    const activity = runningActivity();

    await reconcileStoredActivitySocialSnapshots({
      context: {
        identity,
        privacySnapshot: privacySnapshot({ sharing: 'detailed' }),
        repository,
      },
      activity,
      stagedAt: '2026-07-07T11:00:00.000Z',
    });

    const report = await reconcileStoredActivitySocialSnapshots({
      context: {
        identity,
        privacySnapshot: privacySnapshot({ sharing: 'detailed' }),
        repository,
      },
      activity: {
        ...activity,
        socialSharing: { mode: 'private' },
        updatedAt: '2026-07-07T11:05:00.000Z',
      },
      stagedAt: '2026-07-07T11:05:00.000Z',
    });

    expect(report.tombstoneCount).toBe(1);
    expect([...repository.records.values()][0]?.snapshot).toMatchObject({
      state: 'deleted',
      deletionReason: 'sharingDisabled',
    });
  });

});
