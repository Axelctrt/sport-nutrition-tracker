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
  onActivitySaved: ReturnType<typeof vi.fn>;
  onActivityDeleted: ReturnType<typeof vi.fn>;
  validateLink: ReturnType<typeof vi.fn>;
  reconcileLink: ReturnType<typeof vi.fn>;
  unlinkDeleted: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn(async (data) => createEntity(data));
  const save = vi.fn(async (activity) => activity);
  const remove = vi.fn(async () => undefined);
  const recalculate = vi.fn(async () => undefined);
  const onActivitySaved = vi.fn(async () => undefined);
  const onActivityDeleted = vi.fn(async () => undefined);
  const validateLink = vi.fn(async () => undefined);
  const reconcileLink = vi.fn(async (_previous, saved: Activity) => [saved.date]);
  const unlinkDeleted = vi.fn(async (activity: Activity) => [activity.date]);

  return {
    dependencies: {
      settings: { get: vi.fn(async () => createDefaultAppSettings()) },
      weight: {
        listBetween: vi.fn(async () => [
          createEntity({ date: '2026-06-16', weightKg: 62 }),
          createEntity({ date: '2026-06-18', weightKg: 60 }),
        ]),
      },
      activities: {
        getById: vi.fn(async () => existing),
        create,
        save,
        delete: remove,
      },
      recalculateDailyTarget: recalculate,
      plannedActivityLinks: {
        validate: validateLink,
        reconcile: reconcileLink,
        unlinkDeleted,
      },
      socialActivitySnapshots: {
        onActivitySaved,
        onActivityDeleted,
      },
    },
    create,
    save,
    remove,
    recalculate,
    onActivitySaved,
    onActivityDeleted,
    validateLink,
    reconcileLink,
    unlinkDeleted,
  };
}

describe('activityService', () => {
  it('crée le snapshot avec le poids moyen précédent puis recalcule la journée', async () => {
    const { dependencies, create, recalculate } = createDependencies();

    const activity = await createActivityFromDraft(runningDraft(), profile(), dependencies);

    expect(activity.calculation.weightKg).toBe(61);
    expect(activity.calculation.estimatedCaloriesKcal).toBe(610);
    expect(activity.calculation.calculationVersion).toBe(2);
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


  it('persiste une liaison planifiée explicite et recalcule la date prévue', async () => {
    const { dependencies, create, validateLink, reconcileLink, recalculate } = createDependencies();
    reconcileLink.mockResolvedValueOnce(['2026-07-13', '2026-07-14']);

    const activity = await createActivityFromDraft(
      runningDraft({
        date: '2026-07-14',
        plannedActivity: { source: 'endurancePlanning', sourceId: 'run-plan' },
      }),
      profile(),
      dependencies,
    );

    expect(create.mock.calls[0]?.[0]).toMatchObject({
      plannedActivity: { source: 'endurancePlanning', sourceId: 'run-plan' },
    });
    expect(validateLink).toHaveBeenCalledOnce();
    expect(reconcileLink).toHaveBeenCalledWith(undefined, activity);
    expect(recalculate).toHaveBeenCalledWith('2026-07-13', expect.any(Object));
    expect(recalculate).toHaveBeenCalledWith('2026-07-14', expect.any(Object));
  });

  it('retire la liaison avant de supprimer une activité réelle', async () => {
    const existing = createEntity({
      ...runningDraft({
        plannedActivity: { source: 'endurancePlanning', sourceId: 'run-plan' },
      }),
      calculation: {
        weightKg: 60,
        estimatedCaloriesKcal: 600,
        coefficientUsed: 1,
        calculationVersion: 2,
      },
    }) as Activity;
    const { dependencies, unlinkDeleted, remove } = createDependencies(existing);
    unlinkDeleted.mockResolvedValueOnce(['2026-06-23', '2026-06-24']);

    await deleteActivityAndRecalculate(existing.id, profile(), dependencies);

    expect(unlinkDeleted).toHaveBeenCalledWith(existing);
    expect(remove).toHaveBeenCalledWith(existing.id);
  });

  it('alimente le cycle social après une création sans modifier le résultat sportif', async () => {
    const { dependencies, onActivitySaved } = createDependencies();

    const activity = await createActivityFromDraft(runningDraft(), profile(), dependencies);

    expect(onActivitySaved).toHaveBeenCalledWith(activity);
  });

  it('alimente le cycle social après une mise à jour et une suppression', async () => {
    const existing = createEntity({
      ...runningDraft(),
      calculation: {
        weightKg: 60,
        estimatedCaloriesKcal: 600,
        coefficientUsed: 1,
        calculationVersion: 1,
      },
    }) as Activity;
    const {
      dependencies,
      onActivitySaved,
      onActivityDeleted,
    } = createDependencies(existing);

    const updated = await updateActivityFromDraft(
      existing.id,
      runningDraft({ durationMinutes: 65 }),
      profile(),
      dependencies,
    );
    await deleteActivityAndRecalculate(existing.id, profile(), dependencies);

    expect(onActivitySaved).toHaveBeenCalledWith(updated);
    expect(onActivityDeleted).toHaveBeenCalledWith(existing);
  });

  it('n’interrompt jamais l’enregistrement sportif si le social est indisponible', async () => {
    const { dependencies, onActivitySaved } = createDependencies();
    onActivitySaved.mockRejectedValueOnce(new Error('social unavailable'));

    await expect(
      createActivityFromDraft(runningDraft(), profile(), dependencies),
    ).resolves.toMatchObject({ type: 'running' });
  });


  it('persiste la surcharge sociale avec l’activité avant de notifier le cycle social', async () => {
    const { dependencies, create, onActivitySaved } = createDependencies();
    const socialSharing = { mode: 'private' as const };

    const activity = await createActivityFromDraft(
      runningDraft({ socialSharing }),
      profile(),
      dependencies,
    );

    expect(create.mock.calls[0]?.[0]).toMatchObject({ socialSharing });
    expect(activity.socialSharing).toEqual(socialSharing);
    expect(onActivitySaved).toHaveBeenCalledWith(activity);
  });

});
