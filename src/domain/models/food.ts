import type { DatedEntity, EntityId, EntityMetadata, IsoDateTime } from '@/domain/models/common';

export interface NutritionValues {
  caloriesKcal: number;
  proteinGrams: number;
  carbohydratesGrams: number;
  fatGrams: number;
  fiberGrams?: number;
  saltGrams?: number;
}

export type FoodBasisUnit = 'g' | 'ml';
export type FoodDataSourceType = 'manual' | 'openFoodFacts';

export type FoodProductLocalOverrideField =
  | 'name'
  | 'brand'
  | 'basisUnit'
  | 'caloriesKcal'
  | 'proteinGrams'
  | 'carbohydratesGrams'
  | 'fatGrams'
  | 'fiberGrams'
  | 'saltGrams'
  | 'servingSize'
  | 'servingLabel';

export type FoodDataSource =
  | {
      type: 'manual';
    }
  | {
      type: 'openFoodFacts';
      fetchedAt: IsoDateTime;
      barcode?: string;
    };

export interface FoodProduct extends EntityMetadata {
  name: string;
  brand?: string;
  basisUnit: FoodBasisUnit;
  nutritionPer100: NutritionValues;
  servingSize?: number;
  servingLabel?: string;
  barcode?: string;
  source: FoodDataSource;
  isNutritionComplete: boolean;
  localOverrides?: FoodProductLocalOverrideField[];
  isFavorite: boolean;
  isArchived: boolean;
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface Meal extends DatedEntity {
  slot: MealSlot;
  title?: string;
}

export type FoodEntryReference =
  | {
      sourceType: 'product';
      productId: EntityId;
      inputMode: 'amount' | 'servings';
      inputQuantity: number;
      normalizedAmount: number;
      normalizedUnit: FoodBasisUnit;
      nutritionPer100Snapshot: NutritionValues;
    }
  | {
      sourceType: 'recipe';
      recipeId: EntityId;
      servingsConsumed: number;
      nutritionPerServingSnapshot: NutritionValues;
    };

export interface FoodEntry extends DatedEntity {
  mealId: EntityId;
  mealSlot: MealSlot;
  sourceType: FoodEntryReference['sourceType'];
  reference: FoodEntryReference;
}

export type FavoriteMealItem =
  | {
      id: EntityId;
      sourceType: 'product';
      productId: EntityId;
      inputMode: 'amount' | 'servings';
      inputQuantity: number;
      normalizedAmount: number;
      normalizedUnit: FoodBasisUnit;
      nutritionPer100Snapshot: NutritionValues;
    }
  | {
      id: EntityId;
      sourceType: 'recipe';
      recipeId: EntityId;
      servingsConsumed: number;
      nutritionPerServingSnapshot: NutritionValues;
    };

export interface FavoriteMeal extends EntityMetadata {
  name: string;
  defaultSlot?: MealSlot;
  items: FavoriteMealItem[];
}

export interface DailyJournalStatus extends DatedEntity {
  isComplete: boolean;
  completedAt?: IsoDateTime;
}
