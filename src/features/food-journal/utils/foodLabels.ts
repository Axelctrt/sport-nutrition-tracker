import type { MealSlot } from '@/domain/models/food';

export const mealSlotLabels: Record<MealSlot, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snacks: 'Collations',
};
