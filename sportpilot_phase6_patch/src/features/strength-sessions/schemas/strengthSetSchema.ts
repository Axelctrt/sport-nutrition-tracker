import { z } from 'zod';

export const strengthSetTypeSchema = z.enum(['warmup', 'working', 'dropSet', 'failure', 'other']);


const optionalNonNegativeNumber = (maximum: number, message: string) => z.preprocess(
  (value) => value === '' || value === undefined || value === null ? undefined : Number(value),
  z.number().min(0, message).max(maximum, 'La valeur saisie est trop élevée.').optional(),
);

const optionalRpeSchema = z.preprocess(
  (value) => value === '' || value === undefined || value === null ? undefined : Number(value),
  z.number().min(1, 'Le RPE doit être au minimum de 1.').max(10, 'Le RPE doit être au maximum de 10.')
    .refine((value) => Number.isInteger(value * 2), 'Le RPE doit avancer par pas de 0,5.')
    .optional(),
);

export const strengthSetFormSchema = z.object({
  repetitions: z.coerce.number().int('Les répétitions doivent être un nombre entier.')
    .min(0, 'Les répétitions ne peuvent pas être négatives.')
    .max(999, 'Le nombre de répétitions est trop élevé.'),
  weightKg: z.coerce.number().min(0, 'La charge ne peut pas être négative.')
    .max(2_000, 'La charge est trop élevée.'),
  durationSeconds: optionalNonNegativeNumber(86_400, 'La durée ne peut pas être négative.'),
  distanceMeters: optionalNonNegativeNumber(1_000_000, 'La distance ne peut pas être négative.'),
  rpe: optionalRpeSchema,
  type: strengthSetTypeSchema,
  notes: z.string().trim().max(500, 'Les notes sont limitées à 500 caractères.').optional(),
});

export type StrengthSetFormValues = z.infer<typeof strengthSetFormSchema>;
