import { z } from 'zod';

export const strengthSetTypeSchema = z.enum(['warmup', 'working', 'dropSet', 'failure', 'other']);

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
  rpe: optionalRpeSchema,
  type: strengthSetTypeSchema,
  notes: z.string().trim().max(500, 'Les notes sont limitées à 500 caractères.').optional(),
});

export type StrengthSetFormValues = z.infer<typeof strengthSetFormSchema>;
