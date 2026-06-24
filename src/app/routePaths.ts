export const routePaths = {
  dashboard: '/',
  onboarding: '/onboarding',
  profile: '/profile',
  settings: '/settings',
  food: '/food',
  addFood: '/food/add',
  foodSelector: '/food/select',
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

export function selectFoodPath(date: string, slot: string, productId?: string): string {
  const params = new URLSearchParams({ date, slot });
  if (productId) params.set('productId', productId);
  return `${routePaths.foodSelector}?${params.toString()}`;
}

export function newFoodProductForMealPath(date: string, slot: string): string {
  const params = new URLSearchParams({ returnDate: date, returnSlot: slot });
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
