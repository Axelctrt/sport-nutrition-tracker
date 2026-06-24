import {
  createCustomExercise,
  duplicateExerciseDefinition,
  listExerciseDefinitions,
  setCustomExerciseArchived,
  updateCustomExercise,
} from '@/application/strength/exerciseDefinitionService';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieStrengthExerciseRepository } from '@/infrastructure/repositories/dexie/DexieStrengthExerciseRepository';
import { createEntity } from '@/shared/utils/entities';
import { createExerciseDefinitionInput } from '@/test/factories/strengthFactory';

describe('exerciseDefinitionService', () => {
  let database: AppDatabase;
  let repository: DexieStrengthExerciseRepository;

  beforeEach(async () => {
    database = new AppDatabase(`sportpilot-exercise-service-${crypto.randomUUID()}`);
    await database.open();
    repository = new DexieStrengthExerciseRepository(database);
    await database.exerciseDefinitions.bulkAdd([
      createEntity(createExerciseDefinitionInput({ name: 'Développé couché', primaryMuscleGroup: 'pectorals', equipment: 'barbell', source: 'catalog' }), 'system-1'),
      createEntity(createExerciseDefinitionInput({ name: 'Élévations latérales', primaryMuscleGroup: 'shoulders', equipment: 'dumbbells' }), 'user-1'),
      createEntity(createExerciseDefinitionInput({ name: 'Rowing poulie', primaryMuscleGroup: 'back', secondaryMuscleGroups: ['biceps'], equipment: 'cable', isArchived: true }), 'user-2'),
    ]);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('filtre sans tenir compte des accents et sur les muscles secondaires', async () => {
    const byName = await listExerciseDefinitions(repository, { query: 'elevations' });
    const bySecondaryMuscle = await listExerciseDefinitions(repository, { muscleGroup: 'biceps', includeArchived: true });

    expect(byName.map((exercise) => exercise.id)).toEqual(['user-1']);
    expect(bySecondaryMuscle.map((exercise) => exercise.id)).toEqual(['user-2']);
  });

  it('masque les exercices archivés par défaut et applique les filtres de matériel et d’origine', async () => {
    const visible = await listExerciseDefinitions(repository);
    const catalogBarbell = await listExerciseDefinitions(repository, { source: 'catalog', equipment: 'barbell' });

    expect(visible.map((exercise) => exercise.id)).toEqual(['user-1', 'system-1']);
    expect(catalogBarbell.map((exercise) => exercise.id)).toEqual(['system-1']);
  });

  it('crée, modifie et archive un exercice personnel', async () => {
    const created = await createCustomExercise(repository, {
      name: 'Presse personnalisée',
      primaryMuscleGroup: 'quadriceps',
      secondaryMuscleGroups: ['glutes'],
      equipment: 'machine',
      category: 'strength',
      movementType: 'compound',
      loadUnit: 'kg',
    });
    const updated = await updateCustomExercise(repository, created.id, { name: 'Presse inclinée personnalisée' });
    const archived = await setCustomExerciseArchived(repository, created.id, true);

    expect(created.source).toBe('user');
    expect(updated.name).toBe('Presse inclinée personnalisée');
    expect(archived.isArchived).toBe(true);
  });

  it('interdit la modification directe d’un exercice système', async () => {
    await expect(updateCustomExercise(repository, 'system-1', { name: 'Nom modifié' })).rejects.toThrow(/catalogue système/);
  });

  it('duplique un exercice système en exercice personnel', async () => {
    const duplicate = await duplicateExerciseDefinition(repository, 'system-1');

    expect(duplicate).toMatchObject({
      name: 'Développé couché — copie',
      source: 'user',
      isArchived: false,
      primaryMuscleGroup: 'pectorals',
    });
    expect(duplicate.id).not.toBe('system-1');
  });
});
