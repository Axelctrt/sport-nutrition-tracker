import { describe, expect, it, vi } from 'vitest';
import {
  createActivityFromDraft,
  deleteActivityAndRecalculate,
  updateActivityFromDraft,
  type ActivityDraft,
  type ActivityServiceDependencies,
} from '@/application/activities/activityService';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { Activity } from '@/domain/models/activity';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';

function profile() {
  return createEntity(createProfileInput());
}

function runningDraft(overrides: Partial<ActivityDraft> = {}): ActivityDraft {
  return {
    type: 'running',
    date: '2026-06-23',
    durationMinutes: 60,
    intensity: 'moderate',
    sessionType: 'easy',
    distanceKm: 10,
    averageCadenceSpm: 170,
    ...overrides,
  } as ActivityDraft;
}

function createDependencies(existing?: Activity): {
  dependencies: ActivityServiceDependencies;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  recalculate: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn(async (data) => createEntity(data));
  const save = vi.fn(async (activity) => activity);
  const remove = vi.fn(async () => undefined);
  const recalculate = vi.fn(async () => undefined);

  return {
    dependencies: {
      settings: { get: vi.fn(async () => createDefaultAppSettings()) },
      weight: {
        getLatestOnOrBefore: vi.fn(async () => createEntity({
          date: '2026-06-20',
          weightKg: 62,
        })),
      },
      activities: {
        getById: vi.fn(async () => existing),
        create,
        save,
        delete: remove,
      },
      recalculateDailyTarget: recalculate,
    },
    create,
    save,
    remove,
    recalculate,
  };
}

describe('activityService', () => {
  it('crée le snapshot avec le poids applicable puis recalcule la journée', async () => {
    const { dependencies, create, recalculate } = createDependencies();

    const activity = await createActivityFromDraft(runningDraft(), profile(), dependencies);

    expect(activity.calculation.weightKg).toBe(62);
    expect(activity.calculation.estimatedCaloriesKcal).toBe(620);
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty('rpe');
    expect(recalculate).toHaveBeenCalledWith('2026-06-23', expect.any(Object));
  });

  it('recalcule l’ancienne et la nouvelle journée lors d’un déplacement', async () => {
    const existing = createEntity({
      ...runningDraft(),
      calculation: {
        weightKg: 60,
        estimatedCaloriesKcal: 600,
        coefficientUsed: 1,
        calculationVersion: 1,
      },
    }) as Activity;
    const { dependencies, save, recalculate } = createDependencies(existing);

    await updateActivityFromDraft(
      existing.id,
      runningDraft({ date: '2026-06-24' }),
      profile(),
      dependencies,
    );

    expect(save).toHaveBeenCalledOnce();
    expect(recalculate).toHaveBeenCalledTimes(2);
    expect(recalculate).toHaveBeenCalledWith('2026-06-23', expect.any(Object));
    expect(recalculate).toHaveBeenCalledWith('2026-06-24', expect.any(Object));
  });

  it('conserve le RPE historique lorsqu’une ancienne activité est modifiée', async () => {
    const existing = createEntity({
      ...runningDraft(),
      rpe: 7,
      calculation: {
        weightKg: 60,
        estimatedCaloriesKcal: 600,
        coefficientUsed: 1,
        calculationVersion: 1,
      },
    }) as Activity;
    const { dependencies, save } = createDependencies(existing);

    await updateActivityFromDraft(existing.id, runningDraft({ durationMinutes: 65 }), profile(), dependencies);

    expect(save.mock.calls[0]?.[0]).toMatchObject({ rpe: 7, durationMinutes: 65 });
  });

  it('supprime puis recalcule la journée concernée', async () => {
    const existing = createEntity({
      ...runningDraft(),
      calculation: {
        weightKg: 60,
        estimatedCaloriesKcal: 600,
        coefficientUsed: 1,
        calculationVersion: 1,
      },
    }) as Activity;
    const { dependencies, remove, recalculate } = createDependencies(existing);

    await deleteActivityAndRecalculate(existing.id, profile(), dependencies);

    expect(remove).toHaveBeenCalledWith(existing.id);
    expect(recalculate).toHaveBeenCalledWith(existing.date, expect.any(Object));
  });

  it('ne fait rien si l’activité à supprimer est déjà absente', async () => {
    const { dependencies, remove, recalculate } = createDependencies();

    await deleteActivityAndRecalculate('missing', profile(), dependencies);

    expect(remove).not.toHaveBeenCalled();
    expect(recalculate).not.toHaveBeenCalled();
  });
});
