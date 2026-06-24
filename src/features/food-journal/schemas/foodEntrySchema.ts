import { z } from 'zod';
import { isValidLocalDate } from '@/shared/validation/localDate';

export const foodEntryFormSchema = z.object({
  date: z.string().refine(isValidLocalDate, 'Saisis une date valide.'),
  mealSlot: z.enum(['breakfast', 'lunch', 'dinner', 'snacks']),
  productId: z.string().min(1, 'Sélectionne un aliment.'),
  inputMode: z.enum(['amount', 'servings']),
  inputQuantity: z
    .number({ message: 'Saisis une quantité valide.' })
    .min(0.01, 'La quantité doit être supérieure à zéro.')
    .max(100_000, 'La quantité saisie est trop élevée.'),
});

export type FoodEntryFormValues = z.infer<typeof foodEntryFormSchema>;

export const copyMealFormSchema = z.object({
  targetDate: z.string().refine(isValidLocalDate, 'Saisis une date valide.'),
  targetSlot: z.enum(['breakfast', 'lunch', 'dinner', 'snacks']),
});

export type CopyMealFormValues = z.infer<typeof copyMealFormSchema>;

export const copyDayFormSchema = z.object({
  targetDate: z.string().refine(isValidLocalDate, 'Saisis une date valide.'),
});

export type CopyDayFormValues = z.infer<typeof copyDayFormSchema>;
