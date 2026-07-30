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

const requiredNonNegativeNumber = (
  maximum: number,
  minimumMessage: string,
  maximumMessage: string,
) => z.preprocess(
  (value) => value === '' || value === undefined || value === null ? undefined : Number(value),
  z.number({
    error: (issue) => issue.input === undefined
      ? 'Complète ce champ avant de valider la série.'
      : undefined,
  }).min(0, minimumMessage).max(maximum, maximumMessage),
);

export const strengthSetFormSchema = z.object({
  repetitions: requiredNonNegativeNumber(
    999,
    'Les répétitions ne peuvent pas être négatives.',
    'Le nombre de répétitions est trop élevé.',
  ).pipe(z.number().int('Les répétitions doivent être un nombre entier.')),
  weightKg: requiredNonNegativeNumber(
    2_000,
    'La charge ne peut pas être négative.',
    'La charge est trop élevée.',
  ),
  durationSeconds: optionalNonNegativeNumber(86_400, 'La durée ne peut pas être négative.'),
  distanceMeters: optionalNonNegativeNumber(1_000_000, 'La distance ne peut pas être négative.'),
  rpe: optionalRpeSchema,
  type: strengthSetTypeSchema,
  notes: z.string().trim().max(500, 'Les notes sont limitées à 500 caractères.').optional(),
});

export type StrengthSetFormValues = z.infer<typeof strengthSetFormSchema>;
