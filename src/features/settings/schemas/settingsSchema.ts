import { z } from 'zod';

const metSchema = z
  .number({ message: 'Saisis une valeur MET valide.' })
  .min(1, 'La valeur MET doit être au moins de 1.')
  .max(20, 'La valeur MET ne peut pas dépasser 20.');

export const settingsFormSchema = z
  .object({
    theme: z.enum(['system', 'light', 'dark']),
    includedBaseSteps: z
      .number({ message: 'Saisis un nombre de pas valide.' })
      .int('Le nombre de pas doit être entier.')
      .min(0, 'Le nombre de pas ne peut pas être négatif.')
      .max(30_000, 'Le seuil ne peut pas dépasser 30 000 pas.'),
    walkingKcalPerKgPerKm: z
      .number({ message: 'Saisis un coefficient valide.' })
      .min(0.1, 'Le coefficient doit être au moins de 0,1.')
      .max(2, 'Le coefficient ne peut pas dépasser 2.'),
    runningKcalPerKgPerKm: z
      .number({ message: 'Saisis un coefficient valide.' })
      .min(0.5, 'Le coefficient doit être au moins de 0,5.')
      .max(2, 'Le coefficient ne peut pas dépasser 2.'),
    strengthTrainingMet: metSchema,
    calorieFloorBmrMultiplier: z
      .number({ message: 'Saisis un multiplicateur valide.' })
      .min(1, 'Le plancher doit être au moins égal au métabolisme de repos.')
      .max(2, 'Le multiplicateur ne peut pas dépasser 2.'),
    defaultCyclingMet: metSchema,
    defaultWalkingMet: metSchema,
    defaultOtherCardioMet: metSchema,
    swimmingMetValues: z.object({
      recovery: metSchema,
      technique: metSchema,
      endurance: metSchema,
      tempo: metSchema,
      intervals: metSchema,
      competition: metSchema,
    }),
    maximumWeeklyAdjustmentKcal: z
      .number({ message: 'Saisis une limite valide.' })
      .int('La limite doit être un nombre entier.')
      .min(10, 'La limite doit être au moins de 10 kcal.')
      .max(500, 'La limite ne peut pas dépasser 500 kcal.'),
    maximumCumulativeAdjustmentKcal: z
      .number({ message: 'Saisis une limite valide.' })
      .int('La limite doit être un nombre entier.')
      .min(100, 'La limite doit être au moins de 100 kcal.')
      .max(2_000, 'La limite ne peut pas dépasser 2 000 kcal.'),
    requestPersistentStorage: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.maximumCumulativeAdjustmentKcal < values.maximumWeeklyAdjustmentKcal) {
      context.addIssue({
        code: 'custom',
        path: ['maximumCumulativeAdjustmentKcal'],
        message: 'La limite cumulée doit être supérieure ou égale à la limite hebdomadaire.',
      });
    }
  });

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;
