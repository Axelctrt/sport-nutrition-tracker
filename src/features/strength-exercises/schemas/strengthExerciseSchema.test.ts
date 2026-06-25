import { strengthExerciseFormSchema } from '@/features/strength-exercises/schemas/strengthExerciseSchema';
import { defaultStrengthExerciseFormValues } from '@/features/strength-exercises/utils/strengthExerciseForm';

describe('strengthExerciseFormSchema', () => {
  it('accepte un exercice personnel complet', () => {
    expect(strengthExerciseFormSchema.safeParse({
      ...defaultStrengthExerciseFormValues,
      name: 'Presse à cuisses',
      primaryMuscleGroup: 'quadriceps',
      secondaryMuscleGroups: ['glutes', 'hamstrings'],
      equipment: 'machine',
    }).success).toBe(true);
  });

  it('refuse le groupe principal parmi les muscles secondaires', () => {
    const result = strengthExerciseFormSchema.safeParse({
      ...defaultStrengthExerciseFormValues,
      name: 'Exercice invalide',
      primaryMuscleGroup: 'pectorals',
      secondaryMuscleGroups: ['pectorals'],
    });

    expect(result.success).toBe(false);
  });
});
