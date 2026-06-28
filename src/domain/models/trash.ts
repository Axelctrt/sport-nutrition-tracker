import type { Activity } from '@/domain/models/activity';
import type { EntityId } from '@/domain/models/common';
import type {
  FavoriteMeal,
  FoodEntry,
  Meal,
} from '@/domain/models/food';
import type {
  Recipe,
  RecipeIngredient,
} from '@/domain/models/recipe';
import type { WeightEntry } from '@/domain/models/weight';

export const TRASH_RETENTION_DAYS = 30;

interface TrashItemBase<
  TType extends TrashEntityType,
  TPayload,
> {
  id: string;
  entityType: TType;
  entityId: EntityId;
  label: string;
  deletedAt: string;
  purgeAt: string;
  payload: TPayload;
}

export interface MealTrashPayload {
  meal: Meal;
  entries: FoodEntry[];
}

export interface RecipeTrashPayload {
  recipe: Recipe;
  ingredients: RecipeIngredient[];
}

export type TrashEntityType =
  | 'activity'
  | 'weight'
  | 'foodEntry'
  | 'meal'
  | 'favoriteMeal'
  | 'recipe';

export type TrashItem =
  | TrashItemBase<'activity', Activity>
  | TrashItemBase<'weight', WeightEntry>
  | TrashItemBase<'foodEntry', FoodEntry>
  | TrashItemBase<'meal', MealTrashPayload>
  | TrashItemBase<'favoriteMeal', FavoriteMeal>
  | TrashItemBase<'recipe', RecipeTrashPayload>;
