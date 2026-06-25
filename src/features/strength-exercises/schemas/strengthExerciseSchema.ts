import { z } from 'zod';

const muscleGroupSchema = z.enum([
  'pectorals',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'abdominals',
  'lowerBack',
  'fullBody',
  'other',
]);

export const strengthExerciseFormSchema = z.object({
  name: z.string().trim().min(2, 'Saisis un nom d’au moins 2 caractères.').max(100, 'Le nom ne peut pas dépasser 100 caractères.'),
  primaryMuscleGroup: muscleGroupSchema,
  secondaryMuscleGroups: z.array(muscleGroupSchema).max(6, 'Sélectionne au maximum 6 groupes secondaires.'),
  equipment: z.enum(['barbell', 'dumbbells', 'machine', 'cable', 'bodyweight', 'resistanceBand', 'kettlebell', 'other']),
  category: z.enum(['strength', 'bodyweight', 'conditioning', 'mobility', 'other']),
  movementType: z.enum(['compound', 'isolation', 'core', 'carry', 'other']),
  loadUnit: z.enum(['kg', 'bodyweight', 'assistedKg', 'none']),
  description: z.string().trim().max(1_000, 'La description ne peut pas dépasser 1 000 caractères.'),
}).superRefine((values, context) => {
  if (values.secondaryMuscleGroups.includes(values.primaryMuscleGroup)) {
    context.addIssue({
      code: 'custom',
      path: ['secondaryMuscleGroups'],
      message: 'Le groupe principal ne doit pas être sélectionné comme groupe secondaire.',
    });
  }
});

export type StrengthExerciseFormValues = z.infer<typeof strengthExerciseFormSchema>;
