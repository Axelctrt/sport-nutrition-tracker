import { z } from 'zod';

export const workoutTemplateExerciseFormSchema = z.object({
  exerciseDefinitionId: z.string().min(1, 'Choisis un exercice.'),
  plannedSets: z.number().int().min(1, 'Prévois au moins 1 série.').max(20, 'Maximum 20 séries.'),
  minRepetitions: z.number().int().min(1, 'Minimum 1 répétition.').max(100, 'Maximum 100 répétitions.'),
  maxRepetitions: z.number().int().min(1, 'Minimum 1 répétition.').max(100, 'Maximum 100 répétitions.'),
  targetLoadKg: z.number().min(0, 'La charge ne peut pas être négative.').max(1_000, 'Charge trop élevée.').optional(),
  targetDurationSeconds: z.number().int().min(1, 'La durée doit être positive.').max(86_400, 'Durée trop élevée.').optional(),
  targetDistanceMeters: z.number().min(0.1, 'La distance doit être positive.').max(1_000_000, 'Distance trop élevée.').optional(),
  loadIncrementKg: z.number().positive('L’incrément doit être supérieur à zéro.').max(100, 'Incrément trop élevé.'),
  restSeconds: z.number().int().min(0, 'Le repos ne peut pas être négatif.').max(1_800, 'Maximum 30 minutes.').optional(),
  maximumRecommendedRpe: z.number().min(1, 'Le RPE minimal est 1.').max(10, 'Le RPE maximal est 10.').optional(),
  notes: z.string().trim().max(500, 'Maximum 500 caractères.'),
  isActive: z.boolean(),
  exerciseGroupId: z.string().max(100).optional(),
  exerciseGroupType: z.enum(['superset', 'triSet', 'circuit']).optional(),
  exerciseGroupName: z.string().trim().max(100, 'Maximum 100 caractères.').optional(),
  exerciseGroupRounds: z.number().int().min(1, 'Minimum 1 tour.').max(20, 'Maximum 20 tours.').optional(),
  exerciseGroupRestBetweenExercisesSeconds: z.number().int().min(0).max(1_800).optional(),
  exerciseGroupRestBetweenRoundsSeconds: z.number().int().min(0).max(1_800).optional(),
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
  const groups = new Map<string, { type: 'superset' | 'triSet' | 'circuit'; indexes: number[] }>();
  const exerciseOccurrences = new Map<string, Array<{ groupId: string | undefined; index: number }>>();
  values.exercises.forEach((exercise, index) => {
    const occurrences = exerciseOccurrences.get(exercise.exerciseDefinitionId) ?? [];
    occurrences.push({ groupId: exercise.exerciseGroupId, index });
    exerciseOccurrences.set(exercise.exerciseDefinitionId, occurrences);
    if (!exercise.exerciseGroupId) return;
    const current = groups.get(exercise.exerciseGroupId) ?? {
      type: exercise.exerciseGroupType ?? 'superset',
      indexes: [],
    };
    current.indexes.push(index);
    groups.set(exercise.exerciseGroupId, current);
  });

  for (const occurrences of exerciseOccurrences.values()) {
    if (occurrences.length < 2) continue;
    const groupIds = occurrences.map((occurrence) => occurrence.groupId);
    const validCopies = groupIds.every(Boolean) && new Set(groupIds).size === groupIds.length;
    if (validCopies) continue;
    for (const occurrence of occurrences) {
      context.addIssue({
        code: 'custom',
        path: ['exercises', occurrence.index, 'exerciseDefinitionId'],
        message: 'Cet exercice est déjà présent dans la même organisation.',
      });
    }
  }

  for (const group of groups.values()) {
    const expectedCount = group.type === 'superset' ? 2 : group.type === 'triSet' ? 3 : undefined;
    const valid = expectedCount === undefined ? group.indexes.length >= 2 : group.indexes.length === expectedCount;
    if (valid) continue;
    for (const index of group.indexes) {
      context.addIssue({
        code: 'custom',
        path: ['exercises', index, 'exerciseGroupId'],
        message: group.type === 'circuit'
          ? 'Un circuit doit contenir au moins 2 exercices.'
          : `Ce groupe doit contenir exactement ${expectedCount} exercices.`,
      });
    }
  }
});

export type WorkoutTemplateFormValues = z.infer<typeof workoutTemplateFormSchema>;
