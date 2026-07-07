import {
  reconcileCompletedStrengthSessionSocialSnapshots,
  reconcileStoredActivitySocialSnapshots,
  removePublishedSocialActivitySnapshots,
  type SocialActivityPublicationContext,
  type SocialActivitySnapshotPublicationRepository,
} from '@/application/friends/socialActivityPublicationService';
import type { SocialActivitySnapshotObserver } from '@/application/friends/socialActivitySnapshotObserver';
import type { FriendsPrivacySnapshotRepository } from '@/application/friends/friendsPrivacyService';
import type { SocialIdentityRepository } from '@/application/friends/socialIdentityService';
import type { Activity } from '@/domain/models/activity';
import type { WorkoutSession } from '@/domain/models/strength';
import { appDatabase } from '@/infrastructure/database/database';
import { DexieFriendsPrivacyRepository } from '@/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository';
import { DexieSocialIdentityRepository } from '@/infrastructure/repositories/dexie/DexieSocialIdentityRepository';
import { repositories } from '@/infrastructure/repositories/repositories';
import type { StrengthExerciseRepository } from '@/infrastructure/repositories/contracts/StrengthExerciseRepository';
import type { StrengthSetRepository } from '@/infrastructure/repositories/contracts/StrengthSetRepository';
import type { WorkoutSessionRepository } from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';
import { DexieSocialActivitySnapshotOutboxRepository } from '@/infrastructure/social-activity-snapshots/DexieSocialActivitySnapshotOutboxRepository';
import { SocialActivitySnapshotOutboxDatabase } from '@/infrastructure/social-activity-snapshots/SocialActivitySnapshotOutboxDatabase';

export interface RuntimeSocialActivitySnapshotObserverDependencies {
  readonly identityRepository: SocialIdentityRepository;
  readonly privacyRepository: FriendsPrivacySnapshotRepository;
  readonly outboxRepository: SocialActivitySnapshotPublicationRepository;
  readonly workoutSessions: Pick<WorkoutSessionRepository, 'listExercises'>;
  readonly strengthSets: Pick<StrengthSetRepository, 'listBySession'>;
  readonly strengthExercises: Pick<StrengthExerciseRepository, 'listAll'>;
}

async function loadPublicationContext(
  dependencies: RuntimeSocialActivitySnapshotObserverDependencies,
): Promise<SocialActivityPublicationContext> {
  const [identity, privacySnapshot] = await Promise.all([
    dependencies.identityRepository.readIdentity(),
    dependencies.privacyRepository.readSnapshot(),
  ]);

  return {
    identity,
    privacySnapshot,
    repository: dependencies.outboxRepository,
  };
}

export function createRuntimeSocialActivitySnapshotObserver(
  dependencies: RuntimeSocialActivitySnapshotObserverDependencies,
): SocialActivitySnapshotObserver {
  return {
    async onActivitySaved(activity: Activity): Promise<void> {
      const context = await loadPublicationContext(dependencies);
      await reconcileStoredActivitySocialSnapshots({ context, activity });
    },

    async onActivityDeleted(activity: Activity): Promise<void> {
      const identity = await dependencies.identityRepository.readIdentity();
      await removePublishedSocialActivitySnapshots({
        context: {
          identity,
          repository: dependencies.outboxRepository,
        },
        sourceKind: 'activity',
        sourceActivityId: activity.id,
        sourceRevision: `deleted:${activity.updatedAt}`,
      });
    },

    async onStrengthSessionCompleted(session: WorkoutSession): Promise<void> {
      const [context, exercises, sets, exerciseDefinitions] = await Promise.all([
        loadPublicationContext(dependencies),
        dependencies.workoutSessions.listExercises(session.id),
        dependencies.strengthSets.listBySession(session.id),
        dependencies.strengthExercises.listAll(),
      ]);

      await reconcileCompletedStrengthSessionSocialSnapshots({
        context,
        session,
        exercises,
        sets,
        exerciseDefinitions,
      });
    },
  };
}

const outboxDatabase = new SocialActivitySnapshotOutboxDatabase();

export const runtimeSocialActivitySnapshotObserver = createRuntimeSocialActivitySnapshotObserver({
  identityRepository: new DexieSocialIdentityRepository(appDatabase),
  privacyRepository: new DexieFriendsPrivacyRepository(appDatabase),
  outboxRepository: new DexieSocialActivitySnapshotOutboxRepository(outboxDatabase),
  workoutSessions: repositories.workoutSessions,
  strengthSets: repositories.strengthSets,
  strengthExercises: repositories.strengthExercises,
});
