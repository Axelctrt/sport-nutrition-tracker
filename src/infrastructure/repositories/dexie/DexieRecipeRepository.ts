import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { EntityChanges, EntityId, NewEntity } from '@/domain/models/common';
import type { Recipe, RecipeIngredient } from '@/domain/models/recipe';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { RecipeRepository, SavedRecipe } from '@/infrastructure/repositories/contracts/RecipeRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { moveRecipeToTrash } from '@/infrastructure/repositories/dexie/trashService';
import { createEntity, updateEntity } from '@/shared/utils/entities';

export class DexieRecipeRepository implements RecipeRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  getById(id: EntityId): Promise<Recipe | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire cette recette.',
      () => this.database.recipes.get(id),
    );
  }

  listAll(): Promise<Recipe[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger les recettes.',
      () => this.database.recipes.orderBy('name').toArray(),
    );
  }

  create(data: NewEntity<Recipe>): Promise<Recipe> {
    return runRepositoryOperation(
      'create',
      'Impossible de créer cette recette.',
      async () => {
        const recipe = createEntity<Recipe>(data);
        await this.database.recipes.add(recipe);
        return recipe;
      },
    );
  }

  update(id: EntityId, changes: EntityChanges<Recipe>): Promise<Recipe> {
    return runRepositoryOperation(
      'update',
      'Impossible de modifier cette recette.',
      async () => {
        const current = await this.database.recipes.get(id);

        if (!current) {
          throw new RepositoryError('Recette introuvable.', 'update');
        }

        const updated = updateEntity(current, changes);
        await this.database.recipes.put(updated);
        return updated;
      },
    );
  }

  listIngredients(recipeId: EntityId): Promise<RecipeIngredient[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger les ingrédients de cette recette.',
      () => this.database.recipeIngredients.where('recipeId').equals(recipeId).sortBy('sortOrder'),
    );
  }

  replaceIngredients(
    recipeId: EntityId,
    ingredients: Array<Omit<NewEntity<RecipeIngredient>, 'recipeId'>>,
  ): Promise<RecipeIngredient[]> {
    return runRepositoryOperation(
      'update',
      'Impossible de modifier les ingrédients de cette recette.',
      () => this.database.transaction(
        'rw',
        this.database.recipeIngredients,
        async () => {
          await this.database.recipeIngredients.where('recipeId').equals(recipeId).delete();
          const entities = ingredients.map((ingredient) =>
            createEntity<RecipeIngredient>({ ...ingredient, recipeId }),
          );

          if (entities.length > 0) {
            await this.database.recipeIngredients.bulkAdd(entities);
          }

          return entities;
        },
      ),
    );
  }

  saveWithIngredients(
    data: NewEntity<Recipe>,
    ingredients: Array<Omit<NewEntity<RecipeIngredient>, 'recipeId'>>,
    recipeId?: EntityId,
  ): Promise<SavedRecipe> {
    return runRepositoryOperation(
      recipeId ? 'update' : 'create',
      'Impossible d’enregistrer cette recette.',
      () => this.database.transaction(
        'rw',
        this.database.recipes,
        this.database.recipeIngredients,
        async () => {
          const recipe = recipeId
            ? await (async () => {
                const current = await this.database.recipes.get(recipeId);
                if (!current) throw new RepositoryError('Recette introuvable.', 'update');
                const updated = updateEntity(current, data);
                await this.database.recipes.put(updated);
                return updated;
              })()
            : createEntity<Recipe>(data);

          if (!recipeId) await this.database.recipes.add(recipe);
          await this.database.recipeIngredients.where('recipeId').equals(recipe.id).delete();
          const entities = ingredients.map((ingredient) =>
            createEntity<RecipeIngredient>({ ...ingredient, recipeId: recipe.id }),
          );
          if (entities.length > 0) await this.database.recipeIngredients.bulkAdd(entities);
          return { recipe, ingredients: entities };
        },
      ),
    );
  }

  delete(id: EntityId): Promise<void> {
    return runRepositoryOperation(
      'delete',
      'Impossible de supprimer cette recette.',
      async () => {
        await moveRecipeToTrash(this.database, id);
      },
    );
  }
}
