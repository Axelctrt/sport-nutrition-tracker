import type { WorkoutTemplateInput } from '@/application/strength/workoutTemplateService';
import type { WorkoutTemplateView } from '@/application/strength/workoutTemplateService';
import type { WorkoutTemplateFormValues } from '@/features/strength-templates/schemas/workoutTemplateSchema';

export const defaultWorkoutTemplateFormValues: WorkoutTemplateFormValues = {
  name: '',
  description: '',
  notes: '',
  exercises: [],
};

export const defaultWorkoutTemplateExerciseValues: WorkoutTemplateFormValues['exercises'][number] = {
  exerciseDefinitionId: '',
  plannedSets: 3,
  minRepetitions: 8,
  maxRepetitions: 12,
  targetLoadKg: undefined,
  targetDurationSeconds: undefined,
  targetDistanceMeters: undefined,
  loadIncrementKg: 2.5,
  restSeconds: 120,
  maximumRecommendedRpe: 9,
  notes: '',
  isActive: true,
};

export function workoutTemplateViewToFormValues(view: WorkoutTemplateView): WorkoutTemplateFormValues {
  return {
    name: view.template.name,
    description: view.template.description ?? '',
    notes: view.template.notes ?? '',
    exercises: view.exercises.map(({ configuration }) => ({
      exerciseDefinitionId: configuration.exerciseDefinitionId,
      plannedSets: configuration.plannedSets,
      minRepetitions: configuration.minRepetitions,
      maxRepetitions: configuration.maxRepetitions,
      targetLoadKg: configuration.targetLoadKg,
      targetDurationSeconds: configuration.targetDurationSeconds,
      targetDistanceMeters: configuration.targetDistanceMeters,
      loadIncrementKg: configuration.loadIncrementKg,
      restSeconds: configuration.restSeconds,
      maximumRecommendedRpe: configuration.maximumRecommendedRpe,
      notes: configuration.notes ?? '',
      isActive: configuration.isActive,
    })),
  };
}

export function workoutTemplateFormValuesToInput(values: WorkoutTemplateFormValues): WorkoutTemplateInput {
  return {
    name: values.name,
    ...(values.description ? { description: values.description } : {}),
    ...(values.notes ? { notes: values.notes } : {}),
    exercises: values.exercises.map((exercise) => ({
      exerciseDefinitionId: exercise.exerciseDefinitionId,
      plannedSets: exercise.plannedSets,
      minRepetitions: exercise.minRepetitions,
      maxRepetitions: exercise.maxRepetitions,
      ...(exercise.targetLoadKg !== undefined ? { targetLoadKg: exercise.targetLoadKg } : {}),
      ...(exercise.targetDurationSeconds !== undefined
        ? { targetDurationSeconds: exercise.targetDurationSeconds }
        : {}),
      ...(exercise.targetDistanceMeters !== undefined
        ? { targetDistanceMeters: exercise.targetDistanceMeters }
        : {}),
      loadIncrementKg: exercise.loadIncrementKg,
      ...(exercise.restSeconds !== undefined ? { restSeconds: exercise.restSeconds } : {}),
      ...(exercise.maximumRecommendedRpe !== undefined ? { maximumRecommendedRpe: exercise.maximumRecommendedRpe } : {}),
      ...(exercise.notes ? { notes: exercise.notes } : {}),
      isActive: exercise.isActive,
    })),
  };
}
