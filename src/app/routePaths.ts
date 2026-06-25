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
  addRecipeToJournal: '/recipes/:recipeId/add',
  activities: '/activities',
  strengthExercises: '/strength/exercises',
  newStrengthExercise: '/strength/exercises/new',
  editStrengthExercise: '/strength/exercises/:exerciseId/edit',
  strengthExerciseHistory: '/strength/exercises/:exerciseId/history',
  workoutSessions: '/strength/sessions',
  workoutSession: '/strength/sessions/:sessionId',
  workoutTemplates: '/strength/templates',
  newWorkoutTemplate: '/strength/templates/new',
  editWorkoutTemplate: '/strength/templates/:templateId/edit',
  addActivity: '/activities/add',
  addRunningActivity: '/activities/add/running',
  addSwimmingActivity: '/activities/add/swimming',
  addStrengthActivity: '/activities/add/strength',
  addOtherActivity: '/activities/add/other',
  weight: '/weight',
  history: '/history',
  analytics: '/analytics',
  weeklyReview: '/weekly-review',
  backup: '/backup',
  calculationsInformation: '/information/calculations',
  offline: '/offline',
} as const;

export function editStrengthExercisePath(exerciseId: string): string {
  return `/strength/exercises/${exerciseId}/edit`;
}

export function strengthExerciseHistoryPath(exerciseId: string): string {
  return `/strength/exercises/${exerciseId}/history`;
}


export function workoutSessionPath(sessionId: string): string {
  return `/strength/sessions/${sessionId}`;
}

export function editWorkoutTemplatePath(templateId: string): string {
  return `/strength/templates/${templateId}/edit`;
}

export function editActivityPath(activityId: string): string {
  return `/activities/${activityId}/edit`;
}

export function editRecipePath(recipeId: string): string {
  return `/recipes/${recipeId}/edit`;
}


export function foodJournalPath(date: string): string {
  return `${routePaths.food}?date=${encodeURIComponent(date)}`;
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
  return `/food/entries/${entryId}/edit`;
}

export function editFoodProductPath(productId: string): string {
  return `/food/products/${productId}/edit`;
}

export function addRecipeToJournalPath(
  recipeId: string,
  date: string,
  slot: string,
  entryId?: string,
): string {
  const params = new URLSearchParams({ date, slot });
  if (entryId) params.set('entryId', entryId);
  return `/recipes/${recipeId}/add?${params.toString()}`;
}

export function barcodeScannerPath(date: string, slot: string): string {
  return `${routePaths.barcodeScanner}?date=${encodeURIComponent(date)}&slot=${encodeURIComponent(slot)}`;
}
