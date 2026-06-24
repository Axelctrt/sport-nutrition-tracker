import { workoutTemplateFormSchema } from '@/features/strength-templates/schemas/workoutTemplateSchema';
import { defaultWorkoutTemplateExerciseValues } from '@/features/strength-templates/utils/workoutTemplateForm';

describe('workoutTemplateFormSchema', () => {
  it('accepte une séance modèle complète', () => {
    expect(workoutTemplateFormSchema.safeParse({
      name: 'Push A',
      description: '',
      notes: '',
      exercises: [{ ...defaultWorkoutTemplateExerciseValues, exerciseDefinitionId: 'exercise-1' }],
    }).success).toBe(true);
  });

  it('refuse un exercice dupliqué', () => {
    const result = workoutTemplateFormSchema.safeParse({
      name: 'Push A',
      description: '',
      notes: '',
      exercises: [
        { ...defaultWorkoutTemplateExerciseValues, exerciseDefinitionId: 'exercise-1' },
        { ...defaultWorkoutTemplateExerciseValues, exerciseDefinitionId: 'exercise-1' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('refuse une borne maximale inférieure à la borne minimale', () => {
    const result = workoutTemplateFormSchema.safeParse({
      name: 'Push A',
      description: '',
      notes: '',
      exercises: [{ ...defaultWorkoutTemplateExerciseValues, exerciseDefinitionId: 'exercise-1', minRepetitions: 12, maxRepetitions: 8 }],
    });
    expect(result.success).toBe(false);
  });
});
