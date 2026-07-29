import type { MealSlot } from '@/domain/models/food';

export interface FoodJournalReturnContext {
  path: string;
  scrollKey: string;
  mealSlot: MealSlot;
  addMethodsPath?: string;
}

export interface FoodJournalFeedback {
  title: string;
  mealSlot: MealSlot;
  entryId?: string;
}

export interface FoodJournalNavigationState {
  foodJournalReturn?: FoodJournalReturnContext;
  foodJournalFeedback?: FoodJournalFeedback;
  scroll?: 'top' | 'preserve' | 'restore';
  restoreScrollKey?: string;
}

export function createFoodJournalReturnState(
  path: string,
  scrollKey: string,
  mealSlot: MealSlot,
  addMethodsPath?: string,
): FoodJournalNavigationState {
  return {
    foodJournalReturn: {
      path,
      scrollKey,
      mealSlot,
      ...(addMethodsPath ? { addMethodsPath } : {}),
    },
  };
}

export function createFoodJournalFeedbackState(
  context: FoodJournalReturnContext | undefined,
  feedback: FoodJournalFeedback,
): FoodJournalNavigationState {
  return {
    foodJournalFeedback: feedback,
    ...(context
      ? {
          scroll: 'restore' as const,
          restoreScrollKey: context.scrollKey,
        }
      : {}),
  };
}

export function createFoodJournalRestoreState(
  context: FoodJournalReturnContext | undefined,
): FoodJournalNavigationState | undefined {
  if (!context) return undefined;

  return {
    scroll: 'restore',
    restoreScrollKey: context.scrollKey,
  };
}

export function foodJournalCancelPath(
  context: FoodJournalReturnContext | undefined,
  fallbackPath: string,
): string {
  return context?.addMethodsPath ?? context?.path ?? fallbackPath;
}
