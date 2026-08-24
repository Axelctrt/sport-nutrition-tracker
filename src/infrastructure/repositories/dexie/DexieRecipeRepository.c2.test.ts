import {
  SYNC_LOCAL_DATA_CHANGED_EVENT,
  syncLocalDataChangedDetail,
} from '@/application/sync/syncLocalChangeEvents';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieRecipeRepository } from '@/infrastructure/repositories/dexie/DexieRecipeRepository';

const nutrition = {
  caloriesKcal: 100,
  proteinGrams: 10,
  carbohydratesGrams: 10,
  fatGrams: 2,
};

function recordSyncEvents() {
  const details: unknown[] = [];
  const listener = (event: Event) => {
    details.push(syncLocalDataChangedDetail(event));
  };
  window.addEventListener(SYNC_LOCAL_DATA_CHANGED_EVENT, listener);
  return {
    details,
    dispose: () => window.removeEventListener(
      SYNC_LOCAL_DATA_CHANGED_EVENT,
      listener,
    ),
  };
}

describe('DexieRecipeRepository C2', () => {
  let database: AppDatabase;
  let repository: DexieRecipeRepository;

  beforeEach(async () => {
    database = new AppDatabase(`sportpilot-recipe-c2-${crypto.randomUUID()}`);
    repository = new DexieRecipeRepository(database);
    await database.open();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('crée un marqueur durable pour chaque ancien ingrédient remplacé', async () => {
    const first = await repository.saveWithIngredients(
      { name: 'Recette test', numberOfServings: 2 },
      [{
        productId: 'product-1',
        quantity: 100,
        unit: 'g',
        sortOrder: 0,
        nutritionPer100Snapshot: nutrition,
      }],
    );

    await repository.saveWithIngredients(
      { name: 'Recette test modifiée', numberOfServings: 2 },
      [{
        productId: 'product-2',
        quantity: 150,
        unit: 'g',
        sortOrder: 0,
        nutritionPer100Snapshot: nutrition,
      }],
      first.recipe.id,
    );

    expect(
      await database.deletionRecords.get(
        `deletion:recipeIngredient:${first.ingredients[0]!.id}`,
      ),
    ).toMatchObject({
      entityType: 'recipeIngredient',
      entityId: first.ingredients[0]!.id,
      status: 'deleted',
    });
  });

  it('publie nutrition-library après la sauvegarde atomique durable', async () => {
    const recorded = recordSyncEvents();

    try {
      const saved = await repository.saveWithIngredients(
        { name: 'Recette synchronisée', numberOfServings: 2 },
        [{
          productId: 'product-sync',
          quantity: 120,
          unit: 'g',
          sortOrder: 0,
          nutritionPer100Snapshot: nutrition,
        }],
      );

      expect(await database.recipes.get(saved.recipe.id)).toBeDefined();
      expect(await database.recipeIngredients.get(saved.ingredients[0]!.id))
        .toBeDefined();
      expect(recorded.details).toEqual([{
        domainIds: ['nutrition-library'],
        reason: 'recipe-write',
      }]);
    } finally {
      recorded.dispose();
    }
  });

  it('ne publie rien si la sauvegarde atomique échoue', async () => {
    const recorded = recordSyncEvents();

    try {
      await expect(repository.saveWithIngredients(
        { name: 'Recette absente', numberOfServings: 2 },
        [],
        'recipe-missing',
      )).rejects.toThrow('Recette introuvable');

      expect(recorded.details).toEqual([]);
    } finally {
      recorded.dispose();
    }
  });
});
