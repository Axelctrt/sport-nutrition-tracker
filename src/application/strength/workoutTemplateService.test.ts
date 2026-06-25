import {
  createWorkoutTemplate,
  duplicateWorkoutTemplate,
  getWorkoutTemplateView,
  listWorkoutTemplates,
  setWorkoutTemplateArchived,
  updateWorkoutTemplate,
} from '@/application/strength/workoutTemplateService';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieStrengthExerciseRepository } from '@/infrastructure/repositories/dexie/DexieStrengthExerciseRepository';
import { DexieWorkoutTemplateRepository } from '@/infrastructure/repositories/dexie/DexieWorkoutTemplateRepository';
import { createEntity } from '@/shared/utils/entities';
import { createExerciseDefinitionInput } from '@/test/factories/strengthFactory';

function templateExercise(exerciseDefinitionId: string, overrides: Record<string, unknown> = {}) {
  return {
    exerciseDefinitionId,
    plannedSets: 4,
    minRepetitions: 8,
    maxRepetitions: 12,
    targetLoadKg: 60,
    loadIncrementKg: 2.5,
    restSeconds: 120,
    maximumRecommendedRpe: 9,
    isActive: true,
    ...overrides,
  };
}

describe('workoutTemplateService', () => {
  let database: AppDatabase;
  let templateRepository: DexieWorkoutTemplateRepository;
  let exerciseRepository: DexieStrengthExerciseRepository;

  beforeEach(async () => {
    database = new AppDatabase(`sportpilot-template-service-${crypto.randomUUID()}`);
    await database.open();
    templateRepository = new DexieWorkoutTemplateRepository(database);
    exerciseRepository = new DexieStrengthExerciseRepository(database);
    await database.exerciseDefinitions.bulkAdd([
      createEntity(createExerciseDefinitionInput({ name: 'Développé couché' }), 'exercise-bench'),
      createEntity(createExerciseDefinitionInput({ name: 'Développé militaire', primaryMuscleGroup: 'shoulders' }), 'exercise-press'),
      createEntity(createExerciseDefinitionInput({ name: 'Élévations latérales', primaryMuscleGroup: 'shoulders' }), 'exercise-lateral'),
    ]);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('crée une séance avec un ordre stable et la restitue avec les définitions', async () => {
    const created = await createWorkoutTemplate(templateRepository, {
      name: 'Push A',
      description: 'Séance principale',
      exercises: [templateExercise('exercise-bench'), templateExercise('exercise-press')],
    });
    const view = await getWorkoutTemplateView(templateRepository, exerciseRepository, created.template.id);

    expect(created.exercises.map((exercise) => exercise.sortOrder)).toEqual([0, 1]);
    expect(view.exercises.map(({ exercise }) => exercise.name)).toEqual(['Développé couché', 'Développé militaire']);
  });

  it('modifie et réordonne les exercices en conservant leurs identifiants stables', async () => {
    const created = await createWorkoutTemplate(templateRepository, {
      name: 'Push A',
      exercises: [templateExercise('exercise-bench'), templateExercise('exercise-press')],
    });
    const originalIds = new Map(created.exercises.map((exercise) => [exercise.exerciseDefinitionId, exercise.id]));

    const updated = await updateWorkoutTemplate(templateRepository, created.template.id, {
      name: 'Push B',
      exercises: [templateExercise('exercise-press', { plannedSets: 3 }), templateExercise('exercise-bench')],
    });

    expect(updated.template.name).toBe('Push B');
    expect(updated.exercises.map((exercise) => exercise.exerciseDefinitionId)).toEqual(['exercise-press', 'exercise-bench']);
    expect(updated.exercises[0]?.id).toBe(originalIds.get('exercise-press'));
    expect(updated.exercises[1]?.id).toBe(originalIds.get('exercise-bench'));
    expect(updated.exercises[0]?.plannedSets).toBe(3);
  });

  it('duplique toute la configuration dans une séance indépendante', async () => {
    const created = await createWorkoutTemplate(templateRepository, {
      name: 'Push A',
      exercises: [templateExercise('exercise-bench')],
    });
    const duplicate = await duplicateWorkoutTemplate(templateRepository, created.template.id);

    expect(duplicate.template.name).toBe('Push A — copie');
    expect(duplicate.template.id).not.toBe(created.template.id);
    expect(duplicate.exercises[0]).toMatchObject({ exerciseDefinitionId: 'exercise-bench', plannedSets: 4 });
    expect(duplicate.exercises[0]?.id).not.toBe(created.exercises[0]?.id);
  });

  it('archive une séance sans supprimer ses exercices et la masque par défaut', async () => {
    const created = await createWorkoutTemplate(templateRepository, {
      name: 'Push A',
      exercises: [templateExercise('exercise-bench')],
    });
    await setWorkoutTemplateArchived(templateRepository, created.template.id, true);

    expect(await listWorkoutTemplates(templateRepository)).toEqual([]);
    expect((await listWorkoutTemplates(templateRepository, true))[0]).toMatchObject({
      template: { isArchived: true },
      exerciseCount: 1,
    });
    expect(await templateRepository.listExercises(created.template.id)).toHaveLength(1);
  });

  it('refuse les doublons et les fourchettes de répétitions invalides', async () => {
    await expect(createWorkoutTemplate(templateRepository, {
      name: 'Push A',
      exercises: [templateExercise('exercise-bench'), templateExercise('exercise-bench')],
    })).rejects.toThrow(/même exercice/);

    await expect(createWorkoutTemplate(templateRepository, {
      name: 'Push A',
      exercises: [templateExercise('exercise-bench', { minRepetitions: 12, maxRepetitions: 8 })],
    })).rejects.toThrow(/fourchette/);
  });
});
