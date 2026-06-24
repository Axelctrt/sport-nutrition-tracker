import { recipeFormSchema } from '@/features/recipes/schemas/recipeFormSchema';
import { recipeEntrySchema } from '@/features/recipes/schemas/recipeEntrySchema';

describe('validation des recettes', () => {
  it('accepte une recette complète', () => {
    expect(recipeFormSchema.safeParse({
      name: 'Bol riz poulet',
      numberOfServings: 2,
      notes: '',
      ingredients: [
        { productId: 'rice', quantity: 200 },
        { productId: 'chicken', quantity: 150 },
      ],
    }).success).toBe(true);
  });

  it('refuse une recette vide et les ingrédients dupliqués', () => {
    expect(recipeFormSchema.safeParse({ name: 'Test', numberOfServings: 2, ingredients: [] }).success).toBe(false);
    expect(recipeFormSchema.safeParse({
      name: 'Test',
      numberOfServings: 2,
      ingredients: [
        { productId: 'rice', quantity: 100 },
        { productId: 'rice', quantity: 50 },
      ],
    }).success).toBe(false);
  });

  it('valide l’ajout d’une recette au journal', () => {
    expect(recipeEntrySchema.safeParse({
      date: '2026-06-23',
      mealSlot: 'lunch',
      servingsConsumed: 1.5,
    }).success).toBe(true);
    expect(recipeEntrySchema.safeParse({
      date: '2026-06-23',
      mealSlot: 'lunch',
      servingsConsumed: 0,
    }).success).toBe(false);
  });
});
