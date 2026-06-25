import { z } from 'zod';

export const workoutTemplateExerciseFormSchema = z.object({
  exerciseDefinitionId: z.string().min(1, 'Choisis un exercice.'),
  plannedSets: z.number().int().min(1, 'Prévois au moins 1 série.').max(20, 'Maximum 20 séries.'),
  minRepetitions: z.number().int().min(1, 'Minimum 1 répétition.').max(100, 'Maximum 100 répétitions.'),
  maxRepetitions: z.number().int().min(1, 'Minimum 1 répétition.').max(100, 'Maximum 100 répétitions.'),
  targetLoadKg: z.number().min(0, 'La charge ne peut pas être négative.').max(1_000, 'Charge trop élevée.').optional(),
  loadIncrementKg: z.number().positive('L’incrément doit être supérieur à zéro.').max(100, 'Incrément trop élevé.'),
  restSeconds: z.number().int().min(0, 'Le repos ne peut pas être négatif.').max(1_800, 'Maximum 30 minutes.').optional(),
  maximumRecommendedRpe: z.number().min(1, 'Le RPE minimal est 1.').max(10, 'Le RPE maximal est 10.').optional(),
  notes: z.string().trim().max(500, 'Maximum 500 caractères.'),
  isActive: z.boolean(),
}).superRefine((values, context) => {
  if (values.maxRepetitions < values.minRepetitions) {
    context.addIssue({
      code: 'custom',
      path: ['maxRepetitions'],
      message: 'Le maximum doit être supérieur ou égal au minimum.',
    });
  }
});

export const workoutTemplateFormSchema = z.object({
  name: z.string().trim().min(2, 'Saisis un nom d’au moins 2 caractères.').max(100, 'Maximum 100 caractères.'),
  description: z.string().trim().max(500, 'Maximum 500 caractères.'),
  notes: z.string().trim().max(1_000, 'Maximum 1 000 caractères.'),
  exercises: z.array(workoutTemplateExerciseFormSchema).min(1, 'Ajoute au moins un exercice.').max(30, 'Maximum 30 exercices.'),
}).superRefine((values, context) => {
  const seen = new Set<string>();
  values.exercises.forEach((exercise, index) => {
    if (seen.has(exercise.exerciseDefinitionId)) {
      context.addIssue({
        code: 'custom',
        path: ['exercises', index, 'exerciseDefinitionId'],
        message: 'Cet exercice est déjà présent dans la séance.',
      });
    }
    seen.add(exercise.exerciseDefinitionId);
  });
});

export type WorkoutTemplateFormValues = z.infer<typeof workoutTemplateFormSchema>;
