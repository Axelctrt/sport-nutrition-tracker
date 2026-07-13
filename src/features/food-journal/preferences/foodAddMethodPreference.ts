import type { MealSlot } from '@/domain/models/food';

export const FOOD_ADD_METHODS = [
  'search',
  'recent',
  'scanner',
  'favorites',
  'all',
  'favoriteMeals',
  'photo',
  'recipes',
  'openFoodFacts',
  'manual',
] as const;

export type FoodAddMethod = (typeof FOOD_ADD_METHODS)[number];

const storageKey = 'sportpilot:nutrition:last-add-method:v1';

function isFoodAddMethod(value: unknown): value is FoodAddMethod {
  return typeof value === 'string' && FOOD_ADD_METHODS.includes(value as FoodAddMethod);
}

function getStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function readPreferences(storage: Storage): Partial<Record<MealSlot, FoodAddMethod>> {
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Partial<Record<MealSlot, unknown>>;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => isFoodAddMethod(value)),
    ) as Partial<Record<MealSlot, FoodAddMethod>>;
  } catch {
    return {};
  }
}

export function getLastFoodAddMethod(mealSlot: MealSlot): FoodAddMethod | undefined {
  const storage = getStorage();
  return storage ? readPreferences(storage)[mealSlot] : undefined;
}

export function saveLastFoodAddMethod(mealSlot: MealSlot, method: FoodAddMethod): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(storageKey, JSON.stringify({
      ...readPreferences(storage),
      [mealSlot]: method,
    }));
  } catch {
    // The preference is optional and must never block food logging.
  }
}
