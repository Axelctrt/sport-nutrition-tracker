import type { Activity } from '@/domain/models/activity';
import type { WorkoutSession } from '@/domain/models/strength';

export interface SocialActivitySnapshotObserver {
  readonly onActivitySaved: (activity: Activity) => Promise<void>;
  readonly onActivityDeleted: (activity: Activity) => Promise<void>;
  readonly onStrengthSessionCompleted: (session: WorkoutSession) => Promise<void>;
}

export type SocialActivitySnapshotObserverTaskStatus = 'completed' | 'skipped' | 'failed';

export async function runSocialActivitySnapshotObserverBestEffort(
  task: (() => Promise<void>) | undefined,
): Promise<SocialActivitySnapshotObserverTaskStatus> {
  if (!task) return 'skipped';

  try {
    await task();
    return 'completed';
  } catch {
    return 'failed';
  }
}
