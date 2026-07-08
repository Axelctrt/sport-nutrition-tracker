import {
  projectCompletedStrengthSessionToSocialSnapshotV2,
  projectStoredActivityToSocialSnapshotV2,
} from '@/application/friends/socialActivityProjectionService';
import {
  reconcileSocialActivitySnapshot,
  type SocialActivitySnapshotLifecycleRepository,
} from '@/application/friends/socialActivitySnapshotLifecycleService';
import {
  ALL_SOCIAL_ACTIVITY_FIELD_SELECTION,
  applyFriendScopeToSocialActivitySharingPolicy,
  cloneSocialActivityFieldSelection,
  resolveSocialActivitySharingPolicy,
  type SocialActivityGlobalSharingPolicy,
  type SocialActivitySharingOverride,
} from '@/domain/friends/socialActivitySharingPolicy';
import type {
  SocialActivitySnapshotDeletionReason,
  SocialActivitySnapshotSourceKind,
} from '@/domain/friends/socialActivitySnapshotContract';
import type { SocialActivitySnapshotOutboxRecord } from '@/domain/friends/socialActivitySnapshotOutbox';
import {
  evaluateFriendScopedActivitySharingGuard,
  type FriendProfileSummary,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import type { SocialIdentity } from '@/domain/friends/socialIdentity';
import type { Activity } from '@/domain/models/activity';
import type { EntityId, IsoDateTime } from '@/domain/models/common';
import type {
  ExerciseDefinition,
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
} from '@/domain/models/strength';

export interface SocialActivitySnapshotPublicationRepository
  extends SocialActivitySnapshotLifecycleRepository {
  readonly listBySource: (input: {
    readonly ownerUserId: EntityId;
    readonly sourceKind: SocialActivitySnapshotSourceKind;
    readonly sourceActivityId: EntityId;
  }) => Promise<readonly SocialActivitySnapshotOutboxRecord[]>;
}

export interface SocialActivityPublicationContext {
  readonly identity: SocialIdentity;
  readonly privacySnapshot: FriendsPrivacySnapshot;
  readonly repository: SocialActivitySnapshotPublicationRepository;
}

export interface SocialActivityPublicationReport {
  readonly status: 'reconciled' | 'unsupportedSource';
  readonly processedRecipientCount: number;
  readonly activeSnapshotCount: number;
  readonly tombstoneCount: number;
  readonly unchangedCount: number;
  readonly skippedRecipientCount: number;
}

interface RecipientPlan {
  readonly recipientUserId: EntityId;
  readonly friend?: FriendProfileSummary;
  readonly previous?: SocialActivitySnapshotOutboxRecord;
}

function nowIsoDateTime(): IsoDateTime {
  return new Date().toISOString();
}

export function socialActivityGlobalPolicyFromFriendsPrivacy(
  _snapshot: FriendsPrivacySnapshot,
): SocialActivityGlobalSharingPolicy {
  return {
    visibility: 'detailed',
    fields: cloneSocialActivityFieldSelection(ALL_SOCIAL_ACTIVITY_FIELD_SELECTION),
  };
}

function resolveFriendControlledSharingPolicy(
  override?: SocialActivitySharingOverride,
) {
  const activityPrivacyOverride = override?.mode === 'private'
    ? { mode: 'private' as const }
    : { mode: 'inherit' as const };

  return resolveSocialActivitySharingPolicy(
    {
      visibility: 'detailed',
      fields: cloneSocialActivityFieldSelection(ALL_SOCIAL_ACTIVITY_FIELD_SELECTION),
    },
    activityPrivacyOverride,
  );
}

function buildRecipientPlans(
  friends: readonly FriendProfileSummary[],
  existing: readonly SocialActivitySnapshotOutboxRecord[],
): {
  readonly plans: readonly RecipientPlan[];
  readonly skippedRecipientCount: number;
} {
  const currentFriends = new Map<EntityId, FriendProfileSummary>();
  let skippedRecipientCount = 0;

  for (const friend of friends) {
    if (!friend.userId) {
      skippedRecipientCount += 1;
      continue;
    }
    currentFriends.set(friend.userId, friend);
  }

  const previousByRecipient = new Map(
    existing.map((record) => [record.recipientUserId, record] as const),
  );
  const recipientIds = new Set<EntityId>([
    ...currentFriends.keys(),
    ...previousByRecipient.keys(),
  ]);

  return {
    plans: [...recipientIds]
      .sort((left, right) => left.localeCompare(right))
      .map((recipientUserId) => {
        const currentFriend = currentFriends.get(recipientUserId);
        const previous = previousByRecipient.get(recipientUserId);

        return {
          recipientUserId,
          ...(currentFriend ? { friend: currentFriend } : {}),
          ...(previous ? { previous } : {}),
        };
      }),
    skippedRecipientCount,
  };
}

function emptyReport(
  status: SocialActivityPublicationReport['status'],
  skippedRecipientCount = 0,
): SocialActivityPublicationReport {
  return {
    status,
    processedRecipientCount: 0,
    activeSnapshotCount: 0,
    tombstoneCount: 0,
    unchangedCount: 0,
    skippedRecipientCount,
  };
}

async function reconcilePublicationPlans(input: {
  readonly context: SocialActivityPublicationContext;
  readonly sourceKind: SocialActivitySnapshotSourceKind;
  readonly sourceActivityId: EntityId;
  readonly sourceRevision: string;
  readonly override?: SocialActivitySharingOverride;
  readonly project: (input: {
    readonly ownerUserId: EntityId;
    readonly recipientUserId: EntityId;
    readonly friend: FriendProfileSummary;
    readonly policy: ReturnType<typeof applyFriendScopeToSocialActivitySharingPolicy>;
  }) => ReturnType<typeof projectStoredActivityToSocialSnapshotV2>
    | ReturnType<typeof projectCompletedStrengthSessionToSocialSnapshotV2>;
  readonly stagedAt: IsoDateTime;
}): Promise<SocialActivityPublicationReport> {
  const existing = await input.context.repository.listBySource({
    ownerUserId: input.context.identity.userId,
    sourceKind: input.sourceKind,
    sourceActivityId: input.sourceActivityId,
  });
  const { plans, skippedRecipientCount } = buildRecipientPlans(
    input.context.privacySnapshot.friends,
    existing,
  );
  const resolvedPolicy = resolveFriendControlledSharingPolicy(input.override);

  const results = await Promise.all(plans.map(async (plan) => {
    if (!plan.friend) {
      return reconcileSocialActivitySnapshot({
        repository: input.context.repository,
        ownerUserId: input.context.identity.userId,
        recipientUserId: plan.recipientUserId,
        sourceKind: input.sourceKind,
        sourceActivityId: input.sourceActivityId,
        sourceRevision: input.sourceRevision,
        removalReason: 'friendRevoked',
        stagedAt: input.stagedAt,
      });
    }

    const friendGuard = evaluateFriendScopedActivitySharingGuard(
      input.context.privacySnapshot,
      plan.friend,
      resolvedPolicy.visibility,
    );
    const policy = applyFriendScopeToSocialActivitySharingPolicy(
      resolvedPolicy,
      friendGuard.allowedScope,
      friendGuard.permission.fieldSelection,
    );
    const nextSnapshot = input.project({
      ownerUserId: input.context.identity.userId,
      recipientUserId: plan.recipientUserId,
      friend: plan.friend,
      policy,
    });

    if (nextSnapshot) {
      return reconcileSocialActivitySnapshot({
        repository: input.context.repository,
        nextSnapshot,
        stagedAt: input.stagedAt,
      });
    }

    return reconcileSocialActivitySnapshot({
      repository: input.context.repository,
      ownerUserId: input.context.identity.userId,
      recipientUserId: plan.recipientUserId,
      sourceKind: input.sourceKind,
      sourceActivityId: input.sourceActivityId,
      sourceRevision: input.sourceRevision,
      removalReason: 'sharingDisabled',
      stagedAt: input.stagedAt,
    });
  }));

  return {
    status: 'reconciled',
    processedRecipientCount: plans.length,
    activeSnapshotCount: results.filter((result) => (
      result.record?.snapshot.state === 'active'
      && (result.status === 'created' || result.status === 'updated')
    )).length,
    tombstoneCount: results.filter((result) => (
      result.record?.snapshot.state === 'deleted'
      && result.status === 'deleted'
    )).length,
    unchangedCount: results.filter((result) => (
      result.status === 'unchanged' || result.status === 'notFound'
    )).length,
    skippedRecipientCount,
  };
}

export async function reconcileStoredActivitySocialSnapshots(input: {
  readonly context: SocialActivityPublicationContext;
  readonly activity: Activity;
  readonly override?: SocialActivitySharingOverride;
  readonly stagedAt?: IsoDateTime;
}): Promise<SocialActivityPublicationReport> {
  if (input.activity.type === 'strengthTraining') {
    return emptyReport('unsupportedSource');
  }

  const stagedAt = input.stagedAt ?? nowIsoDateTime();
  return reconcilePublicationPlans({
    context: input.context,
    sourceKind: 'activity',
    sourceActivityId: input.activity.id,
    sourceRevision: input.activity.updatedAt,
    override: input.override ?? input.activity.socialSharing ?? { mode: 'inherit' },
    stagedAt,
    project: ({ ownerUserId, recipientUserId, policy }) => (
      projectStoredActivityToSocialSnapshotV2({
        ownerUserId,
        recipientUserId,
        activity: input.activity,
        policy,
      })
    ),
  });
}

export async function reconcileCompletedStrengthSessionSocialSnapshots(input: {
  readonly context: SocialActivityPublicationContext;
  readonly session: WorkoutSession;
  readonly exercises: readonly WorkoutSessionExercise[];
  readonly sets: readonly StrengthSet[];
  readonly exerciseDefinitions?: readonly ExerciseDefinition[];
  readonly override?: SocialActivitySharingOverride;
  readonly stagedAt?: IsoDateTime;
}): Promise<SocialActivityPublicationReport> {
  if (input.session.status !== 'completed') {
    return emptyReport('unsupportedSource');
  }

  const stagedAt = input.stagedAt ?? nowIsoDateTime();
  return reconcilePublicationPlans({
    context: input.context,
    sourceKind: 'strengthSession',
    sourceActivityId: input.session.id,
    sourceRevision: input.session.updatedAt,
    override: input.override ?? input.session.socialSharing ?? { mode: 'inherit' },
    stagedAt,
    project: ({ ownerUserId, recipientUserId, policy }) => (
      projectCompletedStrengthSessionToSocialSnapshotV2({
        ownerUserId,
        recipientUserId,
        session: input.session,
        exercises: input.exercises,
        sets: input.sets,
        ...(input.exerciseDefinitions
          ? { exerciseDefinitions: input.exerciseDefinitions }
          : {}),
        policy,
      })
    ),
  });
}

export async function removePublishedSocialActivitySnapshots(input: {
  readonly context: Pick<SocialActivityPublicationContext, 'identity' | 'repository'>;
  readonly sourceKind: SocialActivitySnapshotSourceKind;
  readonly sourceActivityId: EntityId;
  readonly removalReason?: SocialActivitySnapshotDeletionReason;
  readonly sourceRevision?: string;
  readonly stagedAt?: IsoDateTime;
}): Promise<SocialActivityPublicationReport> {
  const stagedAt = input.stagedAt ?? nowIsoDateTime();
  const sourceRevision = input.sourceRevision ?? `deleted:${stagedAt}`;
  const existing = await input.context.repository.listBySource({
    ownerUserId: input.context.identity.userId,
    sourceKind: input.sourceKind,
    sourceActivityId: input.sourceActivityId,
  });

  const results = await Promise.all(existing.map((record) => (
    reconcileSocialActivitySnapshot({
      repository: input.context.repository,
      ownerUserId: input.context.identity.userId,
      recipientUserId: record.recipientUserId,
      sourceKind: input.sourceKind,
      sourceActivityId: input.sourceActivityId,
      sourceRevision,
      removalReason: input.removalReason ?? 'sourceDeleted',
      stagedAt,
    })
  )));

  return {
    status: 'reconciled',
    processedRecipientCount: existing.length,
    activeSnapshotCount: 0,
    tombstoneCount: results.filter((result) => result.status === 'deleted').length,
    unchangedCount: results.filter((result) => (
      result.status === 'unchanged' || result.status === 'notFound'
    )).length,
    skippedRecipientCount: 0,
  };
}
