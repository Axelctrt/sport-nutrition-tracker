import { describe, expect, it, vi } from 'vitest';
import {
  listPlannedActivityLinkOptions,
  reconcileActivityPlannedLink,
  unlinkDeletedActivity,
  validateActivityPlannedLink,
  type ActivityReconciliationDependencies,
} from '@/application/planning/activityReconciliationService';
import type { Activity, RunningActivity, StrengthTrainingActivity } from '@/domain/models/activity';
import type { PlannedEnduranceSession } from '@/domain/planning/endurancePlanningState';
import type { WorkoutSession } from '@/domain/models/strength';
import { createEntity } from '@/shared/utils/entities';

function runningActivity(overrides: Partial<Activity> = {}): Activity {
  const created = createEntity<RunningActivity>({
    type: 'running',
    date: '2026-07-13',
    durationMinutes: 50,
    intensity: 'moderate',
    sessionType: 'easy',
    distanceKm: 8,
    averageCadenceSpm: 170,
    calculation: {
      weightKg: 70,
      estimatedCaloriesKcal: 560,
      calculationVersion: 2,
    },
  });
  return { ...created, ...overrides } as Activity;
}

function strengthSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  const created = createEntity<WorkoutSession>({
    date: '2026-07-14',
    plannedDate: '2026-07-14',
    status: 'planned',
    plannedDurationMinutes: 60,
    sourceTemplateNameSnapshot: 'Push',
  });
  return { ...created, ...overrides };
}

function enduranceSession(
  overrides: Partial<PlannedEnduranceSession> = {},
): PlannedEnduranceSession {
  return {
    id: 'run-plan',
    title: 'Footing',
    activityType: 'running',
    date: '2026-07-13',
    intensity: 'moderate',
    targetDurationMinutes: 50,
    status: 'planned',
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
    ...overrides,
  };
}

function createDependencies(input: {
  activities?: Activity[];
  strengthSessions?: WorkoutSession[];
  enduranceSessions?: PlannedEnduranceSession[];
} = {}) {
  let activities = [...(input.activities ?? [])];
  let strengthSessions = [...(input.strengthSessions ?? [])];
  let enduranceSessions = [...(input.enduranceSessions ?? [])];
  const updateStrength = vi.fn(async (id: string, changes: Partial<WorkoutSession>) => {
    const current = strengthSessions.find((session) => session.id === id);
    if (!current) throw new Error('missing');
    const updated = { ...current, ...changes, updatedAt: '2026-07-13T12:00:00.000Z' } as WorkoutSession;
    strengthSessions = strengthSessions.map((session) => session.id === id ? updated : session);
    return updated;
  });

  const dependencies: ActivityReconciliationDependencies = {
    activities: {
      listAll: vi.fn(async () => [...activities]),
      save: vi.fn(async (activity: Activity) => {
        activities = activities.map((candidate) => candidate.id === activity.id ? activity : candidate);
        return activity;
      }),
    },
    workoutSessions: {
      listAll: vi.fn(async () => [...strengthSessions]),
      getById: vi.fn(async (id: string) => strengthSessions.find((session) => session.id === id)),
      update: updateStrength,
    },
    readEnduranceSessions: () => [...enduranceSessions],
    writeEnduranceSessions: (sessions) => {
      enduranceSessions = sessions.map((session) => ({ ...session }));
    },
  };

  return {
    dependencies,
    updateStrength,
    getStrengthSessions: () => strengthSessions,
    getEnduranceSessions: () => enduranceSessions,
  };
}

describe('activityReconciliationService', () => {
  it('liste les séances planifiées avec une clé persistante', async () => {
    const strength = strengthSession({ id: 'strength-plan' });
    const endurance = enduranceSession();
    const { dependencies } = createDependencies({
      strengthSessions: [strength],
      enduranceSessions: [endurance],
    });

    const options = await listPlannedActivityLinkOptions(dependencies);

    expect(options).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'endurancePlanning:run-plan',
        activityType: 'running',
      }),
      expect.objectContaining({
        key: 'strengthSession:strength-plan',
        activityType: 'strengthTraining',
      }),
    ]));
  });

  it('refuse qu’une séance prévue soit liée à deux activités', async () => {
    const existing = runningActivity({
      id: 'activity-1',
      plannedActivity: { source: 'endurancePlanning', sourceId: 'run-plan' },
    });
    const candidate = runningActivity({
      id: 'activity-2',
      plannedActivity: { source: 'endurancePlanning', sourceId: 'run-plan' },
    });
    const { dependencies } = createDependencies({
      activities: [existing],
      enduranceSessions: [enduranceSession()],
    });

    await expect(validateActivityPlannedLink(candidate, dependencies))
      .rejects.toThrow('déjà associée');
  });

  it('lie explicitement une activité d’endurance et retourne les dates à recalculer', async () => {
    const activity = runningActivity({
      id: 'activity-1',
      date: '2026-07-14',
      plannedActivity: { source: 'endurancePlanning', sourceId: 'run-plan' },
    });
    const { dependencies, getEnduranceSessions } = createDependencies({
      enduranceSessions: [enduranceSession()],
    });

    const dates = await reconcileActivityPlannedLink(undefined, activity, dependencies);

    expect(dates).toEqual(expect.arrayContaining(['2026-07-13', '2026-07-14']));
    expect(getEnduranceSessions()[0]?.completedActivityId).toBe('activity-1');
  });

  it('marque une séance de musculation simple comme réalisée puis la restaure après suppression', async () => {
    const session = strengthSession({ id: 'strength-plan' });
    const activity = createEntity<StrengthTrainingActivity>({
      type: 'strengthTraining',
      date: '2026-07-15',
      durationMinutes: 45,
      intensity: 'moderate',
      met: 5,
      plannedActivity: { source: 'strengthSession', sourceId: session.id },
      calculation: {
        weightKg: 70,
        estimatedCaloriesKcal: 220,
        calculationVersion: 2,
      },
    });
    const { dependencies, getStrengthSessions } = createDependencies({
      strengthSessions: [session],
    });

    await reconcileActivityPlannedLink(undefined, activity, dependencies);
    expect(getStrengthSessions()[0]).toMatchObject({
      status: 'completed',
      date: '2026-07-15',
      completedActivityId: activity.id,
      durationMinutes: 45,
    });

    await unlinkDeletedActivity(activity, dependencies);
    expect(getStrengthSessions()[0]).toMatchObject({
      status: 'planned',
      date: '2026-07-14',
    });
    expect(getStrengthSessions()[0]?.completedActivityId).toBeUndefined();
  });
});
