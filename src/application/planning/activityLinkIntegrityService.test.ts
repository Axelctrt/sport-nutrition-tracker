import { vi } from 'vitest';
import {
  reconcilePersistedActivityLinks,
  type ActivityLinkIntegrityDependencies,
} from '@/application/planning/activityLinkIntegrityService';
import type { Activity, RunningActivity } from '@/domain/models/activity';
import type { WorkoutSession } from '@/domain/models/strength';
import type { PlannedEnduranceSession } from '@/domain/planning/endurancePlanningState';
import { createEntity } from '@/shared/utils/entities';
import { createRunningActivityInput } from '@/test/factories/activityFactory';
import { createWorkoutSessionInput } from '@/test/factories/strengthFactory';

function activity(
  id: string,
  overrides: Partial<RunningActivity> = {},
): Activity {
  return {
    ...createEntity<RunningActivity>(
      createRunningActivityInput(),
      id,
      overrides.createdAt ?? '2026-07-01T08:00:00.000Z',
    ),
    ...overrides,
  };
}

function strengthSession(
  id: string,
  overrides: Partial<WorkoutSession> = {},
): WorkoutSession {
  const session = createEntity<WorkoutSession>(
    createWorkoutSessionInput({
      status: 'planned',
      date: '2026-07-14',
      plannedDate: '2026-07-14',
    }),
    id,
    overrides.createdAt ?? '2026-07-01T08:00:00.000Z',
  );
  delete session.startedAt;
  delete session.completedAt;
  delete session.durationMinutes;
  return Object.assign(session, overrides);
}

function enduranceSession(
  id: string,
  overrides: Partial<PlannedEnduranceSession> = {},
): PlannedEnduranceSession {
  return {
    id,
    title: 'Footing prévu',
    activityType: 'running',
    date: '2026-07-14',
    intensity: 'low',
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
}) {
  let activities = [...(input.activities ?? [])];
  let strengthSessions = [...(input.strengthSessions ?? [])];
  let enduranceSessions = [...(input.enduranceSessions ?? [])];

  const dependencies: ActivityLinkIntegrityDependencies = {
    activities: {
      listAll: vi.fn(async () => activities.map((value) => ({ ...value }))),
      save: vi.fn(async (value: Activity) => {
        activities = activities.map((candidate) =>
          candidate.id === value.id ? { ...value } : candidate
        );
        return value;
      }),
    },
    workoutSessions: {
      listAll: vi.fn(async () => strengthSessions.map((value) => ({ ...value }))),
      update: vi.fn(async (id, changes) => {
        const current = strengthSessions.find((value) => value.id === id);
        if (!current) throw new Error('session absente');
        const updated = { ...current, ...changes } as WorkoutSession;
        strengthSessions = strengthSessions.map((value) =>
          value.id === id ? updated : value
        );
        return updated;
      }),
    },
    readEnduranceSessions: () => enduranceSessions.map((value) => ({ ...value })),
    writeEnduranceSessions: vi.fn((values: readonly PlannedEnduranceSession[]) => {
      enduranceSessions = values.map((value) => ({ ...value }));
    }),
  };

  return {
    dependencies,
    getActivities: () => activities,
    getStrengthSessions: () => strengthSessions,
    getEnduranceSessions: () => enduranceSessions,
  };
}

describe('activityLinkIntegrityService', () => {
  it('restaure la référence manquante depuis un miroir endurance valide', async () => {
    const state = createDependencies({
      activities: [activity('activity-1')],
      enduranceSessions: [enduranceSession('planned-1', {
        completedActivityId: 'activity-1',
      })],
    });

    const report = await reconcilePersistedActivityLinks(state.dependencies);

    expect(state.getActivities()[0]?.plannedActivity).toEqual({
      source: 'endurancePlanning',
      sourceId: 'planned-1',
    });
    expect(report.repairedActivityReferences).toBe(1);
  });

  it('résout deux revendications en conservant le miroir explicite', async () => {
    const first = activity('activity-1', {
      plannedActivity: { source: 'endurancePlanning', sourceId: 'planned-1' },
      updatedAt: '2026-07-14T10:00:00.000Z',
    });
    const second = activity('activity-2', {
      plannedActivity: { source: 'endurancePlanning', sourceId: 'planned-1' },
      updatedAt: '2026-07-14T11:00:00.000Z',
    });
    const state = createDependencies({
      activities: [first, second],
      enduranceSessions: [enduranceSession('planned-1', {
        completedActivityId: 'activity-1',
      })],
    });

    const report = await reconcilePersistedActivityLinks(state.dependencies);

    expect(state.getActivities().find((value) => value.id === 'activity-1')?.plannedActivity)
      .toEqual({ source: 'endurancePlanning', sourceId: 'planned-1' });
    expect(state.getActivities().find((value) => value.id === 'activity-2')?.plannedActivity)
      .toBeUndefined();
    expect(report.resolvedDuplicateClaims).toBe(1);
  });

  it('conserve une référence orpheline pendant une synchronisation partielle', async () => {
    const state = createDependencies({
      activities: [activity('activity-1', {
        plannedActivity: { source: 'endurancePlanning', sourceId: 'missing' },
      })],
    });

    await reconcilePersistedActivityLinks(state.dependencies);

    expect(state.getActivities()[0]?.plannedActivity).toEqual({
      source: 'endurancePlanning',
      sourceId: 'missing',
    });
  });

  it('supprime une référence orpheline lors d’une restauration complète', async () => {
    const state = createDependencies({
      activities: [activity('activity-1', {
        plannedActivity: { source: 'endurancePlanning', sourceId: 'missing' },
      })],
    });

    const report = await reconcilePersistedActivityLinks(
      state.dependencies,
      { removeDanglingActivityReferences: true },
    );

    expect(state.getActivities()[0]?.plannedActivity).toBeUndefined();
    expect(report.removedInvalidActivityReferences).toBe(1);
  });

  it('restaure une séance simple planifiée lorsque son activité miroir a disparu', async () => {
    const state = createDependencies({
      strengthSessions: [strengthSession('strength-1', {
        status: 'completed',
        completedActivityId: 'missing-activity',
        completedAt: '2026-07-14T11:00:00.000Z',
        durationMinutes: 45,
      })],
    });

    const report = await reconcilePersistedActivityLinks(state.dependencies);

    expect(state.getStrengthSessions()[0]).toMatchObject({
      status: 'planned',
      date: '2026-07-14',
    });
    expect(state.getStrengthSessions()[0]?.completedActivityId).toBeUndefined();
    expect(report.clearedInvalidSourceMirrors).toBe(1);
  });
});
