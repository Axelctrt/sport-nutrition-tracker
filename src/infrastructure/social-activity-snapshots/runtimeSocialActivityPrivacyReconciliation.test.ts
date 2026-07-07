import { vi } from 'vitest';
import { reconcileAllSocialActivityPrivacy } from '@/infrastructure/social-activity-snapshots/runtimeSocialActivityPrivacyReconciliation';
import type { Activity, RunningActivity, StrengthTrainingActivity } from '@/domain/models/activity';
import type { WorkoutSession } from '@/domain/models/strength';
import { createEntity } from '@/shared/utils/entities';
import { createRunningActivityInput } from '@/test/factories/activityFactory';
import { createWorkoutSessionInput } from '@/test/factories/strengthFactory';

describe('runtime social activity privacy reconciliation', () => {
  it('réconcilie les activités compatibles et les séances terminées sans republier les sources incomplètes', async () => {
    const running = createEntity<RunningActivity>(createRunningActivityInput(), 'activity-running');
    const strengthActivity = createEntity<StrengthTrainingActivity>({
      type: 'strengthTraining' as const,
      date: '2026-07-07',
      durationMinutes: 45,
      intensity: 'moderate' as const,
      met: 6,
      calculation: {
        weightKg: 60,
        estimatedCaloriesKcal: 270,
        calculationVersion: 1,
      },
    }, 'activity-strength');
    const completedSession = createEntity<WorkoutSession>(createWorkoutSessionInput({ status: 'completed' }), 'session-completed');
    const inProgressSession = createEntity<WorkoutSession>(createWorkoutSessionInput({ status: 'inProgress' }), 'session-progress');
    const onActivitySaved = vi.fn(async () => undefined);
    const onStrengthSessionCompleted = vi.fn(async () => undefined);

    const report = await reconcileAllSocialActivityPrivacy({
      activities: { listAll: vi.fn<() => Promise<Activity[]>>(async () => [running, strengthActivity]) },
      workoutSessions: { listAll: vi.fn<() => Promise<WorkoutSession[]>>(async () => [completedSession, inProgressSession]) },
      observer: { onActivitySaved, onStrengthSessionCompleted },
    });

    expect(report).toEqual({ activityCount: 1, strengthSessionCount: 1, failureCount: 0 });
    expect(onActivitySaved).toHaveBeenCalledWith(running);
    expect(onActivitySaved).not.toHaveBeenCalledWith(strengthActivity);
    expect(onStrengthSessionCompleted).toHaveBeenCalledWith(completedSession);
  });

  it('poursuit la réconciliation si une source sociale échoue', async () => {
    const first = createEntity<RunningActivity>(createRunningActivityInput(), 'activity-first');
    const second = createEntity<RunningActivity>(createRunningActivityInput(), 'activity-second');
    const onActivitySaved = vi.fn()
      .mockRejectedValueOnce(new Error('social unavailable'))
      .mockResolvedValueOnce(undefined);

    const report = await reconcileAllSocialActivityPrivacy({
      activities: { listAll: vi.fn<() => Promise<Activity[]>>(async () => [first, second]) },
      workoutSessions: { listAll: vi.fn<() => Promise<WorkoutSession[]>>(async () => []) },
      observer: {
        onActivitySaved,
        onStrengthSessionCompleted: vi.fn(async () => undefined),
      },
    });

    expect(report).toEqual({ activityCount: 1, strengthSessionCount: 0, failureCount: 1 });
  });
});
