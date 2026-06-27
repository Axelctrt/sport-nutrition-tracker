export const routePaths = {
  dashboard: '/',
  onboarding: '/onboarding',
  profile: '/profile',
  settings: '/settings',
  food: '/food',
  addFood: '/food/add',
  foodSelector: '/food/select',
  barcodeScanner: '/food/barcode-scanner',
  foodProducts: '/food/products',
  newFoodProduct: '/food/products/new',
  editFoodEntry: '/food/entries/:entryId/edit',
  editFoodProduct: '/food/products/:productId/edit',
  foodSearch: '/food/search',
  favoriteMeals: '/food/favorites',
  recipes: '/recipes',
  newRecipe: '/recipes/new',
  editRecipe: '/recipes/:recipeId/edit',
  addRecipeToJournal: '/recipes/:recipeId/add',
  activities: '/activities',
  strengthExercises: '/strength/exercises',
  newStrengthExercise: '/strength/exercises/new',
  editStrengthExercise: '/strength/exercises/:exerciseId/edit',
  strengthExerciseHistory: '/strength/exercises/:exerciseId/history',
  workoutSessions: '/strength/sessions',
  weeklyPlanning: '/strength/planning',
  workoutSession: '/strength/sessions/:sessionId',
  workoutTemplates: '/strength/templates',
  newWorkoutTemplate: '/strength/templates/new',
  editWorkoutTemplate: '/strength/templates/:templateId/edit',
  addActivity: '/activities/add',
  enduranceTemplates: '/activities/templates',
  addRunningActivity: '/activities/add/running',
  addSwimmingActivity: '/activities/add/swimming',
  addStrengthActivity: '/activities/add/strength',
  addOtherActivity: '/activities/add/other',
  editActivity: '/activities/:activityId/edit',
  weight: '/weight',
  history: '/history',
  analytics: '/analytics',
  weeklyReview: '/weekly-review',
  backup: '/backup',
  calculationsInformation: '/information/calculations',
  privacy: '/privacy',
  offline: '/offline',
} as const;

export function editStrengthExercisePath(exerciseId: string): string {
  return routePaths.editStrengthExercise.replace(':exerciseId', encodeURIComponent(exerciseId));
}

export function strengthExerciseHistoryPath(exerciseId: string): string {
  return routePaths.strengthExerciseHistory.replace(':exerciseId', encodeURIComponent(exerciseId));
}


export function workoutSessionPath(sessionId: string): string {
  return routePaths.workoutSession.replace(':sessionId', encodeURIComponent(sessionId));
}

export function editWorkoutTemplatePath(templateId: string): string {
  return routePaths.editWorkoutTemplate.replace(':templateId', encodeURIComponent(templateId));
}

export function editActivityPath(activityId: string): string {
  return routePaths.editActivity.replace(':activityId', encodeURIComponent(activityId));
}

export function editRecipePath(recipeId: string): string {
  return routePaths.editRecipe.replace(':recipeId', encodeURIComponent(recipeId));
}


export function foodJournalPath(date: string): string {
  return `${routePaths.food}?date=${encodeURIComponent(date)}`;
}

export function weightPath(date: string): string {
  return `${routePaths.weight}?date=${encodeURIComponent(date)}`;
}

export function addFoodPath(date: string, slot: string): string {
  return `${routePaths.addFood}?date=${encodeURIComponent(date)}&slot=${encodeURIComponent(slot)}`;
}

export type FoodSelectorSource = 'openFoodFacts';

export function selectFoodPath(
  date: string,
  slot: string,
  productId?: string,
  source?: FoodSelectorSource,
): string {
  const params = new URLSearchParams({ date, slot });
  if (productId) params.set('productId', productId);
  if (source) params.set('source', source);
  return `${routePaths.foodSelector}?${params.toString()}`;
}

export function newFoodProductForMealPath(
  date: string,
  slot: string,
  barcode?: string,
): string {
  const params = new URLSearchParams({ returnDate: date, returnSlot: slot });
  if (barcode) params.set('barcode', barcode);
  return `${routePaths.newFoodProduct}?${params.toString()}`;
}

export function editFoodEntryPath(entryId: string): string {
  return routePaths.editFoodEntry.replace(':entryId', encodeURIComponent(entryId));
}

export function editFoodProductPath(productId: string): string {
  return routePaths.editFoodProduct.replace(':productId', encodeURIComponent(productId));
}

export function addRecipeToJournalPath(
  recipeId: string,
  date: string,
  slot: string,
  entryId?: string,
): string {
  const params = new URLSearchParams({ date, slot });
  if (entryId) params.set('entryId', entryId);
  const path = routePaths.addRecipeToJournal.replace(':recipeId', encodeURIComponent(recipeId));
  return `${path}?${params.toString()}`;
}

export function barcodeScannerPath(date: string, slot: string): string {
  return `${routePaths.barcodeScanner}?date=${encodeURIComponent(date)}&slot=${encodeURIComponent(slot)}`;
}
