import type { MealSlot } from '@/domain/models/food';

export interface FoodJournalReturnContext {
  path: string;
  scrollKey: string;
  mealSlot: MealSlot;
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
): FoodJournalNavigationState {
  return {
    foodJournalReturn: {
      path,
      scrollKey,
      mealSlot,
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
