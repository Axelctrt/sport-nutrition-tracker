import { z } from 'zod';

const ingredientSchema = z.object({
  productId: z.string().min(1, 'Sélectionne un aliment.'),
  quantity: z.number().finite().positive('La quantité doit être supérieure à zéro.').max(100_000, 'Quantité trop élevée.'),
});

export const recipeFormSchema = z.object({
  name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(120, 'Nom trop long.'),
  numberOfServings: z.number().finite().positive('Le nombre de portions doit être supérieur à zéro.').max(1_000, 'Nombre de portions trop élevé.'),
  notes: z.string().trim().max(2_000, 'Notes trop longues.').optional(),
  ingredients: z.array(ingredientSchema).min(1, 'Ajoute au moins un ingrédient.').superRefine((ingredients, context) => {
    const seen = new Set<string>();
    ingredients.forEach((ingredient, index) => {
      if (seen.has(ingredient.productId)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'productId'],
          message: 'Cet aliment est déjà présent dans la recette.',
        });
      }
      seen.add(ingredient.productId);
    });
  }),
});

export type RecipeFormValues = z.infer<typeof recipeFormSchema>;
