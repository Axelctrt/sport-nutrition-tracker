import { z } from 'zod';
import { isValidLocalDate } from '@/shared/validation/localDate';

export const weightEntryFormSchema = z.object({
  date: z
    .string()
    .refine(isValidLocalDate, 'Saisis une date valide.'),
  weightKg: z
    .number({ message: 'Saisis un poids valide.' })
    .min(30, 'Le poids doit être au moins de 30 kg.')
    .max(350, 'Le poids ne peut pas dépasser 350 kg.'),
  note: z
    .string()
    .trim()
    .max(500, 'La note ne peut pas dépasser 500 caractères.'),
});

export type WeightEntryFormValues = z.infer<typeof weightEntryFormSchema>;
