import type { EntityId, EntityMetadata } from '@/domain/models/common';
import type { FoodBasisUnit, NutritionValues } from '@/domain/models/food';

export interface Recipe extends EntityMetadata {
  name: string;
  numberOfServings: number;
  notes?: string;
}

export interface RecipeIngredient extends EntityMetadata {
  recipeId: EntityId;
  productId: EntityId;
  quantity: number;
  unit: FoodBasisUnit;
  sortOrder: number;
  nutritionPer100Snapshot: NutritionValues;
}
