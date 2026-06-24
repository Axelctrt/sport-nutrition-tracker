import { exerciseCatalog } from '@/domain/defaults/exerciseCatalog';
import { ensureExerciseCatalog } from '@/application/strength/exerciseCatalogSeeder';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { createEntity } from '@/shared/utils/entities';
import { createExerciseDefinitionInput } from '@/test/factories/strengthFactory';

function createTestDatabase(): AppDatabase {
  return new AppDatabase(`sportpilot-exercise-catalog-${crypto.randomUUID()}`);
}

describe('ensureExerciseCatalog', () => {
  let database: AppDatabase;

  beforeEach(async () => {
    database = createTestDatabase();
    await database.open();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('installe le catalogue local une seule fois', async () => {
    const firstCount = await ensureExerciseCatalog(database, '2026-06-25T00:00:00.000Z');
    const secondCount = await ensureExerciseCatalog(database, '2026-06-25T01:00:00.000Z');

    expect(firstCount).toBe(exerciseCatalog.length);
    expect(secondCount).toBe(0);
    expect(await database.exerciseDefinitions.count()).toBe(exerciseCatalog.length);
    expect(await database.exerciseDefinitions.get('catalog:barbell-bench-press')).toMatchObject({
      name: 'Développé couché à la barre',
      source: 'catalog',
      isArchived: false,
    });
  });

  it('préserve les exercices personnels et les modifications locales existantes', async () => {
    await ensureExerciseCatalog(database);
    await database.exerciseDefinitions.add(
      createEntity(createExerciseDefinitionInput({ name: 'Mon exercice' }), 'custom-1'),
    );
    await database.exerciseDefinitions.update('catalog:barbell-bench-press', { isArchived: true });

    await ensureExerciseCatalog(database);

    expect(await database.exerciseDefinitions.get('custom-1')).toMatchObject({ name: 'Mon exercice' });
    expect(await database.exerciseDefinitions.get('catalog:barbell-bench-press')).toMatchObject({ isArchived: true });
    expect(await database.exerciseDefinitions.count()).toBe(exerciseCatalog.length + 1);
  });
});
