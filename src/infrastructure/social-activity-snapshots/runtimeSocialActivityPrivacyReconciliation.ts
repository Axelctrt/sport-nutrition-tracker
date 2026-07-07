import type { SocialActivitySnapshotObserver } from '@/application/friends/socialActivitySnapshotObserver';
import type { ActivityRepository } from '@/infrastructure/repositories/contracts/ActivityRepository';
import type { WorkoutSessionRepository } from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';
import { repositories } from '@/infrastructure/repositories/repositories';
import { runtimeSocialActivitySnapshotObserver } from '@/infrastructure/social-activity-snapshots/runtimeSocialActivitySnapshotObserver';

export interface SocialActivityPrivacyReconciliationDependencies {
  readonly activities: Pick<ActivityRepository, 'listAll'>;
  readonly workoutSessions: Pick<WorkoutSessionRepository, 'listAll'>;
  readonly observer: Pick<
    SocialActivitySnapshotObserver,
    'onActivitySaved' | 'onStrengthSessionCompleted'
  >;
}

export interface SocialActivityPrivacyReconciliationReport {
  readonly activityCount: number;
  readonly strengthSessionCount: number;
  readonly failureCount: number;
}

export async function reconcileAllSocialActivityPrivacy(
  dependencies: SocialActivityPrivacyReconciliationDependencies,
): Promise<SocialActivityPrivacyReconciliationReport> {
  const [activities, sessions] = await Promise.all([
    dependencies.activities.listAll(),
    dependencies.workoutSessions.listAll(),
  ]);

  let activityCount = 0;
  let strengthSessionCount = 0;
  let failureCount = 0;

  for (const activity of activities) {
    if (activity.type === 'strengthTraining') continue;
    try {
      await dependencies.observer.onActivitySaved(activity);
      activityCount += 1;
    } catch {
      failureCount += 1;
    }
  }

  for (const session of sessions) {
    if (session.status !== 'completed') continue;
    try {
      await dependencies.observer.onStrengthSessionCompleted(session);
      strengthSessionCount += 1;
    } catch {
      failureCount += 1;
    }
  }

  return { activityCount, strengthSessionCount, failureCount };
}

export function reconcileRuntimeSocialActivityPrivacy(): Promise<SocialActivityPrivacyReconciliationReport> {
  return reconcileAllSocialActivityPrivacy({
    activities: repositories.activities,
    workoutSessions: repositories.workoutSessions,
    observer: runtimeSocialActivitySnapshotObserver,
  });
}
