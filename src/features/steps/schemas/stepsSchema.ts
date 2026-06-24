import { z } from 'zod';

export const stepsFormSchema = z.object({
  totalSteps: z
    .number({ message: 'Saisis un nombre de pas valide.' })
    .int('Le nombre de pas doit être un entier.')
    .min(0, 'Le nombre de pas ne peut pas être négatif.')
    .max(200_000, 'Le nombre de pas ne peut pas dépasser 200 000.'),
});

export type StepsFormValues = z.infer<typeof stepsFormSchema>;
