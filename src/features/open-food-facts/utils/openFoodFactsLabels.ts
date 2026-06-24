import type { RequiredNutritionField } from '@/infrastructure/open-food-facts/OpenFoodFactsMapper';

const nutritionFieldLabels: Record<RequiredNutritionField, string> = {
  caloriesKcal: 'calories',
  proteinGrams: 'protéines',
  carbohydratesGrams: 'glucides',
  fatGrams: 'lipides',
};

export function formatMissingNutritionFields(fields: RequiredNutritionField[]): string {
  return fields.map((field) => nutritionFieldLabels[field]).join(', ');
}
