import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieRecipeRepository } from '@/infrastructure/repositories/dexie/DexieRecipeRepository';

const nutrition = {
  caloriesKcal: 100,
  proteinGrams: 10,
  carbohydratesGrams: 10,
  fatGrams: 2,
};

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
});
