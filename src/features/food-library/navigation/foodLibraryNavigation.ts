export type FoodLibrarySection = 'products' | 'recipes';

export interface FoodLibraryReturnContext {
  path: string;
  scrollKey: string;
  section: FoodLibrarySection;
}

export interface FoodLibraryFeedback {
  title: string;
  itemId?: string;
}

export interface FoodLibraryNavigationState {
  foodLibraryReturn?: FoodLibraryReturnContext;
  foodLibraryFeedback?: FoodLibraryFeedback;
  scroll?: 'top' | 'preserve' | 'restore';
  restoreScrollKey?: string;
}

export function createFoodLibraryReturnState(
  path: string,
  scrollKey: string,
  section: FoodLibrarySection,
): FoodLibraryNavigationState {
  return {
    foodLibraryReturn: {
      path,
      scrollKey,
      section,
    },
  };
}

export function createFoodLibraryFeedbackState(
  context: FoodLibraryReturnContext | undefined,
  feedback: FoodLibraryFeedback,
): FoodLibraryNavigationState {
  return {
    foodLibraryFeedback: feedback,
    ...(context
      ? {
          scroll: 'restore' as const,
          restoreScrollKey: context.scrollKey,
        }
      : {}),
  };
}

export function createFoodLibraryRestoreState(
  context: FoodLibraryReturnContext | undefined,
): FoodLibraryNavigationState | undefined {
  if (!context) return undefined;

  return {
    scroll: 'restore',
    restoreScrollKey: context.scrollKey,
  };
}
