import { vi } from 'vitest';

import type { SocialActivitySnapshotPublicationRepository } from '@/application/friends/socialActivityPublicationService';
import { DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION } from '@/domain/friends/socialActivitySharingPolicy';
import type { SocialActivitySnapshotOutboxRecord } from '@/domain/friends/socialActivitySnapshotOutbox';
import {
  createFriendActivityPermissionId,
  type FriendProfileSummary,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import type { SocialIdentity } from '@/domain/friends/socialIdentity';
import type { EntityId } from '@/domain/models/common';
import type {
  ExerciseDefinition,
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
} from '@/domain/models/strength';
import {
  createRuntimeSocialActivitySnapshotObserver,
} from '@/infrastructure/social-activity-snapshots/runtimeSocialActivitySnapshotObserver';
import { createEntity } from '@/shared/utils/entities';
import { createRunningActivityInput } from '@/test/factories/activityFactory';
import {
  createExerciseDefinitionInput,
  createStrengthSetInput,
  createWorkoutSessionExerciseInput,
  createWorkoutSessionInput,
} from '@/test/factories/strengthFactory';

class MemoryOutboxRepository implements SocialActivitySnapshotPublicationRepository {
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
const friend: FriendProfileSummary = {
  id: 'friend-user',
  userId: 'friend-user',
  displayName: 'Friend Run',
  handle: 'friend.run',
  initials: 'FR',
};
const privacySnapshot: FriendsPrivacySnapshot = {
  friends: [friend],
  requests: [],
  privacy: {
    profileVisibility: 'friends',
    activitySharing: 'detailed',
    allowFriendRequests: true,
    requireManualApproval: true,
  },
  activityPermissions: [{
    id: createFriendActivityPermissionId(friend),
    friendUserId: 'friend-user',
    friendHandle: friend.handle,
    sharingLevel: 'detailed',
    detailedConsent: 'granted',
    detailedConsentGrantedAt: '2026-07-07T09:00:00.000Z',
  }],
};

function strengthFixture(): {
  readonly session: WorkoutSession;
  readonly exercises: readonly WorkoutSessionExercise[];
  readonly sets: readonly StrengthSet[];
  readonly definitions: readonly ExerciseDefinition[];
} {
  const session = createEntity<WorkoutSession>(
    createWorkoutSessionInput({
      status: 'completed',
      completedAt: '2026-07-07T18:00:00.000Z',
      durationMinutes: 60,
    }),
    'session-completed',
    '2026-07-07T17:00:00.000Z',
  );
  const exercise = createEntity<WorkoutSessionExercise>(
    createWorkoutSessionExerciseInput({
      sessionId: session.id,
      exerciseDefinitionId: 'definition-bench',
      exerciseNameSnapshot: 'Développé couché',
    }),
    'session-exercise',
    '2026-07-07T17:05:00.000Z',
  );
  const set = createEntity<StrengthSet>(
    createStrengthSetInput({
      sessionId: session.id,
      sessionExerciseId: exercise.id,
      repetitions: 10,
      weightKg: 60,
    }),
    'set-1',
    '2026-07-07T17:30:00.000Z',
  );
  const definition = createEntity<ExerciseDefinition>(
    createExerciseDefinitionInput({ name: 'Développé couché' }),
    'definition-bench',
    '2026-07-01T10:00:00.000Z',
  );

  return { session, exercises: [exercise], sets: [set], definitions: [definition] };
}

describe('runtime social activity snapshot observer', () => {
  it('charge le contexte local puis met à jour et supprime une activité réelle', async () => {
    const outboxRepository = new MemoryOutboxRepository();
    const notifyOutboxChanged = vi.fn();
    const observer = createRuntimeSocialActivitySnapshotObserver({
      identityRepository: { readIdentity: vi.fn(async () => identity), saveIdentity: vi.fn() },
      privacyRepository: {
        readSnapshot: vi.fn(async () => privacySnapshot),
        saveSnapshot: vi.fn(),
      },
      outboxRepository,
      workoutSessions: { listExercises: vi.fn(async () => []) },
      strengthSets: { listBySession: vi.fn(async () => []) },
      strengthExercises: { listAll: vi.fn(async () => []) },
      notifyOutboxChanged,
    });
    const activity = createEntity(
      createRunningActivityInput({ notes: 'Privé' }),
      'activity-run',
      '2026-07-07T10:00:00.000Z',
    );

    await observer.onActivitySaved(activity);
    expect([...outboxRepository.records.values()][0]?.snapshot).toMatchObject({
      state: 'active',
      sourceActivityId: activity.id,
    });

    await observer.onActivityDeleted(activity);
    expect([...outboxRepository.records.values()][0]?.snapshot).toMatchObject({
      state: 'deleted',
      deletionReason: 'sourceDeleted',
    });
    expect(notifyOutboxChanged).toHaveBeenCalledTimes(2);
  });

  it('ignore un ancien mode résumé de l’activité et suit uniquement la permission de l’ami', async () => {
    const outboxRepository = new MemoryOutboxRepository();
    const notifyOutboxChanged = vi.fn();
    const observer = createRuntimeSocialActivitySnapshotObserver({
      identityRepository: { readIdentity: vi.fn(async () => identity), saveIdentity: vi.fn() },
      privacyRepository: {
        readSnapshot: vi.fn(async () => ({
          ...privacySnapshot,
          privacy: {
            ...privacySnapshot.privacy,
            activitySharing: 'disabled' as const,
            socialActivitySharingPolicy: {
              visibility: 'private' as const,
              fields: DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION,
            },
          },
        })),
        saveSnapshot: vi.fn(),
      },
      outboxRepository,
      workoutSessions: { listExercises: vi.fn(async () => []) },
      strengthSets: { listBySession: vi.fn(async () => []) },
      strengthExercises: { listAll: vi.fn(async () => []) },
      notifyOutboxChanged,
    });
    const activity = {
      ...createEntity(
        createRunningActivityInput({ notes: 'Privé' }),
        'activity-override',
        '2026-07-07T10:00:00.000Z',
      ),
      socialSharing: { mode: 'summary' as const },
    };

    await observer.onActivitySaved(activity);

    expect([...outboxRepository.records.values()][0]?.snapshot).toMatchObject({
      state: 'active',
      visibility: 'detailed',
      sourceActivityId: activity.id,
    });
    expect(notifyOutboxChanged).toHaveBeenCalledOnce();
  });


  it('utilise le userId canonique avant de créer l’outbox', async () => {
    const outboxRepository = new MemoryOutboxRepository();
    const canonicalIdentity = {
      ...identity,
      userId: 'dexie-user-123' as EntityId,
    };
    const observer = createRuntimeSocialActivitySnapshotObserver({
      identityRepository: { readIdentity: vi.fn(async () => identity), saveIdentity: vi.fn() },
      privacyRepository: {
        readSnapshot: vi.fn(async () => privacySnapshot),
        saveSnapshot: vi.fn(),
      },
      outboxRepository,
      workoutSessions: { listExercises: vi.fn(async () => []) },
      strengthSets: { listBySession: vi.fn(async () => []) },
      strengthExercises: { listAll: vi.fn(async () => []) },
      reconcileIdentity: vi.fn(async () => canonicalIdentity),
    });
    const activity = createEntity(
      createRunningActivityInput(),
      'activity-canonical-owner',
      '2026-07-08T10:00:00.000Z',
    );

    await observer.onActivitySaved(activity);

    expect([...outboxRepository.records.values()][0]).toMatchObject({
      ownerUserId: canonicalIdentity.userId,
      snapshot: {
        ownerUserId: canonicalIdentity.userId,
      },
    });
  });

  it('charge les exercices et séries uniquement après une séance terminée', async () => {
    const outboxRepository = new MemoryOutboxRepository();
    const notifyOutboxChanged = vi.fn();
    const fixture = strengthFixture();
    const listExercises = vi.fn(async () => fixture.exercises as WorkoutSessionExercise[]);
    const listBySession = vi.fn(async () => fixture.sets as StrengthSet[]);
    const listAll = vi.fn(async () => fixture.definitions as ExerciseDefinition[]);
    const observer = createRuntimeSocialActivitySnapshotObserver({
      identityRepository: { readIdentity: vi.fn(async () => identity), saveIdentity: vi.fn() },
      privacyRepository: {
        readSnapshot: vi.fn(async () => privacySnapshot),
        saveSnapshot: vi.fn(),
      },
      outboxRepository,
      workoutSessions: { listExercises },
      strengthSets: { listBySession },
      strengthExercises: { listAll },
      notifyOutboxChanged,
    });

    await observer.onStrengthSessionCompleted(fixture.session);

    expect(listExercises).toHaveBeenCalledWith(fixture.session.id);
    expect(listBySession).toHaveBeenCalledWith(fixture.session.id);
    expect(listAll).toHaveBeenCalledOnce();
    expect([...outboxRepository.records.values()][0]?.snapshot).toMatchObject({
      state: 'active',
      sourceKind: 'strengthSession',
      family: 'strength',
    });
    expect(notifyOutboxChanged).toHaveBeenCalledOnce();
  });
});
