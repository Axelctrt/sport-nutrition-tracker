import {
  loadDailyActivityPlanning,
  planDailyStrengthActivity,
  saveDailyEnduranceActivity,
  skipDailyEnduranceActivity,
  skipDailyStrengthActivity,
  startDailyStrengthActivity,
  updateDailyStrengthActivity,
  type DailyActivityPlanningDependencies,
} from '@/application/planning/dailyActivityPlanningService';
import {
  hydrateEndurancePlanningRuntime,
  readEndurancePlanningState,
  resetEndurancePlanningRuntimeForTests,
} from '@/domain/planning/endurancePlanningState';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieActivityRepository } from '@/infrastructure/repositories/dexie/DexieActivityRepository';
import { DexieStrengthExerciseRepository } from '@/infrastructure/repositories/dexie/DexieStrengthExerciseRepository';
import { DexieStrengthSetRepository } from '@/infrastructure/repositories/dexie/DexieStrengthSetRepository';
import { DexieWorkoutSessionRepository } from '@/infrastructure/repositories/dexie/DexieWorkoutSessionRepository';
import { DexieWorkoutTemplateRepository } from '@/infrastructure/repositories/dexie/DexieWorkoutTemplateRepository';
import { createEntity } from '@/shared/utils/entities';
import {
  createExerciseDefinitionInput,
  createWorkoutTemplateExerciseInput,
  createWorkoutTemplateInput,
} from '@/test/factories/strengthFactory';

describe('dailyActivityPlanningService', () => {
  let database: AppDatabase;
  let dependencies: DailyActivityPlanningDependencies;
  const recalculateTargets = vi.fn<(dates: readonly string[]) => Promise<void>>();

  beforeEach(async () => {
    database = new AppDatabase(`sportpilot-daily-planning-${crypto.randomUUID()}`);
    await database.open();
    hydrateEndurancePlanningRuntime({ version: 1, sessions: [] }, async () => undefined);
    recalculateTargets.mockReset();
    recalculateTargets.mockResolvedValue(undefined);

    dependencies = {
      workoutSessions: new DexieWorkoutSessionRepository(database),
      workoutTemplates: new DexieWorkoutTemplateRepository(database),
      strengthExercises: new DexieStrengthExerciseRepository(database),
      strengthSets: new DexieStrengthSetRepository(database),
      activities: new DexieActivityRepository(database),
      readEnduranceSessions: () => readEndurancePlanningState().sessions,
      recalculateTargets,
    };

    await database.exerciseDefinitions.add(createEntity(
      createExerciseDefinitionInput({ name: 'Développé couché' }),
      'exercise-bench',
    ));
    await database.workoutTemplates.add(createEntity(
      createWorkoutTemplateInput({ name: 'Push' }),
      'template-push',
    ));
    await database.workoutTemplateExercises.add(createEntity(
      createWorkoutTemplateExerciseInput({
        templateId: 'template-push',
        exerciseDefinitionId: 'exercise-bench',
      }),
      'template-exercise-bench',
    ));
  });

  afterEach(async () => {
    resetEndurancePlanningRuntimeForTests();
    database.close();
    await database.delete();
  });

  it('planifie un modèle et une séance libre puis démarre uniquement sur demande', async () => {
    const plannedFromTemplate = await planDailyStrengthActivity({
      date: '2026-07-29',
      templateId: 'template-push',
      plannedDurationMinutes: 60,
      strengthSessionStyle: 'classic',
    }, dependencies);
    const plannedFree = await planDailyStrengthActivity({
      date: '2026-07-29',
      plannedDurationMinutes: 45,
      strengthSessionStyle: 'circuit',
    }, dependencies);

    expect(plannedFromTemplate.status).toBe('planned');
    expect(plannedFromTemplate.startedAt).toBeUndefined();
    expect(plannedFree).toMatchObject({
      status: 'planned',
      plannedDurationMinutes: 45,
    });
    expect(await dependencies.workoutSessions.listExercises(plannedFree.id)).toEqual([]);

    const beforeStart = await loadDailyActivityPlanning('2026-07-29', dependencies);
    expect(beforeStart.strengthSessions).toHaveLength(2);

    const started = await startDailyStrengthActivity(plannedFromTemplate.id, dependencies);
    expect(started.status).toBe('inProgress');
    expect(await dependencies.strengthSets.listBySession(started.id)).toHaveLength(4);

    await skipDailyStrengthActivity(plannedFree.id, dependencies);
    const afterSkip = await loadDailyActivityPlanning('2026-07-29', dependencies);
    expect(afterSkip.strengthSessions.map(({ session }) => session.id)).toEqual([started.id]);
    expect(recalculateTargets).toHaveBeenCalledWith(['2026-07-29']);
  });

  it('conserve plusieurs endurances et recalcule les anciennes et nouvelles dates', async () => {
    const run = await saveDailyEnduranceActivity({
      title: 'Footing facile',
      activityType: 'running',
      date: '2026-07-29',
      intensity: 'low',
      targetDurationMinutes: 35,
      targetDistanceKm: 6,
    }, undefined, dependencies);
    const swim = await saveDailyEnduranceActivity({
      title: 'Technique',
      activityType: 'swimming',
      date: '2026-07-29',
      intensity: 'moderate',
      targetDurationMinutes: 40,
      targetDistanceMeters: 1_500,
    }, undefined, dependencies);

    expect((await loadDailyActivityPlanning('2026-07-29', dependencies)).enduranceSessions)
      .toHaveLength(2);

    await saveDailyEnduranceActivity({
      title: 'Footing reporté',
      activityType: 'running',
      date: '2026-07-30',
      intensity: 'moderate',
      targetDurationMinutes: 45,
    }, run.id, dependencies);
    expect(recalculateTargets).toHaveBeenCalledWith(['2026-07-29', '2026-07-30']);

    await skipDailyEnduranceActivity(swim.id, dependencies);
    expect((await loadDailyActivityPlanning('2026-07-29', dependencies)).enduranceSessions)
      .toEqual([]);
  });

  it('modifie et reporte une séance libre encore prévue', async () => {
    const session = await planDailyStrengthActivity({
      date: '2026-07-29',
      plannedDurationMinutes: 45,
      strengthSessionStyle: 'classic',
    }, dependencies);

    const updated = await updateDailyStrengthActivity({
      sessionId: session.id,
      date: '2026-07-30',
      plannedDurationMinutes: 70,
      strengthSessionStyle: 'strength',
    }, dependencies);

    expect(updated).toMatchObject({
      plannedDate: '2026-07-30',
      originalPlannedDate: '2026-07-29',
      plannedDurationMinutes: 70,
      strengthSessionStyle: 'strength',
    });
    expect(recalculateTargets).toHaveBeenCalledWith(['2026-07-29', '2026-07-30']);
  });
});
