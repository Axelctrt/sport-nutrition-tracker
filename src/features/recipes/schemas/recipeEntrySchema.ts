import { z } from 'zod';
import { isValidLocalDate } from '@/shared/validation/localDate';

export const recipeEntrySchema = z.object({
  date: z.string().refine(isValidLocalDate, 'Date invalide.'),
  mealSlot: z.enum(['breakfast', 'lunch', 'dinner', 'snacks']),
  servingsConsumed: z.number().finite().positive('Le nombre de portions doit être supérieur à zéro.').max(100, 'Nombre de portions trop élevé.'),
});

export type RecipeEntryFormValues = z.infer<typeof recipeEntrySchema>;
