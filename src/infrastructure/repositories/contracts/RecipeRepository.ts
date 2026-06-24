import type { EntityChanges, EntityId, NewEntity } from '@/domain/models/common';
import type { Recipe, RecipeIngredient } from '@/domain/models/recipe';

export interface SavedRecipe {
  recipe: Recipe;
  ingredients: RecipeIngredient[];
}

export interface RecipeRepository {
  getById(id: EntityId): Promise<Recipe | undefined>;
  listAll(): Promise<Recipe[]>;
  create(data: NewEntity<Recipe>): Promise<Recipe>;
  update(id: EntityId, changes: EntityChanges<Recipe>): Promise<Recipe>;
  listIngredients(recipeId: EntityId): Promise<RecipeIngredient[]>;
  replaceIngredients(
    recipeId: EntityId,
    ingredients: Array<Omit<NewEntity<RecipeIngredient>, 'recipeId'>>,
  ): Promise<RecipeIngredient[]>;
  saveWithIngredients(
    data: NewEntity<Recipe>,
    ingredients: Array<Omit<NewEntity<RecipeIngredient>, 'recipeId'>>,
    recipeId?: EntityId,
  ): Promise<SavedRecipe>;
  delete(id: EntityId): Promise<void>;
}
