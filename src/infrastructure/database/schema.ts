export const databaseTableNames = [
  'userProfile',
  'appSettings',
  'weights',
  'dailySteps',
  'activities',
  'foodProducts',
  'meals',
  'foodEntries',
  'favoriteMeals',
  'recipes',
  'recipeIngredients',
  'dailyTargets',
  'dailyJournalStatuses',
  'weeklyReviews',
  'acceptedCalorieAdjustments',
] as const;

export type DatabaseTableName = (typeof databaseTableNames)[number];

export const databaseSchemaVersion = 1;

export const schemaVersion1: Record<DatabaseTableName, string> = {
  userProfile: 'id, updatedAt',
  appSettings: 'id, updatedAt',
  weights: 'id, &date, updatedAt',
  dailySteps: 'id, &date, updatedAt',
  activities: 'id, date, type, [date+type], updatedAt',
  foodProducts: 'id, name, barcode, isFavorite, isArchived, updatedAt',
  meals: 'id, &[date+slot], date, slot, updatedAt',
  foodEntries: 'id, date, mealId, mealSlot, sourceType, [date+mealSlot], updatedAt',
  favoriteMeals: 'id, name, updatedAt',
  recipes: 'id, name, updatedAt',
  recipeIngredients: 'id, recipeId, productId, [recipeId+sortOrder], updatedAt',
  dailyTargets: 'id, &date, updatedAt',
  dailyJournalStatuses: 'id, &date, isComplete, updatedAt',
  weeklyReviews: 'id, &weekStart, updatedAt',
  acceptedCalorieAdjustments: 'id, effectiveFrom, status, updatedAt',
};
