import type { WorkoutTemplateInput, WorkoutTemplateView } from '@/application/strength/workoutTemplateService';
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
  exerciseGroupId: undefined,
  exerciseGroupType: undefined,
  exerciseGroupName: '',
  exerciseGroupRounds: undefined,
  exerciseGroupRestBetweenExercisesSeconds: undefined,
  exerciseGroupRestBetweenRoundsSeconds: undefined,
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
      exerciseGroupId: configuration.exerciseGroupId,
      exerciseGroupType: configuration.exerciseGroupType,
      exerciseGroupName: configuration.exerciseGroupName ?? '',
      exerciseGroupRounds: configuration.exerciseGroupRounds,
      exerciseGroupRestBetweenExercisesSeconds: configuration.exerciseGroupRestBetweenExercisesSeconds,
      exerciseGroupRestBetweenRoundsSeconds: configuration.exerciseGroupRestBetweenRoundsSeconds,
    })),
  };
}

export function workoutTemplateFormValuesToInput(values: WorkoutTemplateFormValues): WorkoutTemplateInput {
  const groupSettings = new Map<string, WorkoutTemplateFormValues['exercises'][number]>();
  for (const exercise of values.exercises) {
    if (exercise.exerciseGroupId && !groupSettings.has(exercise.exerciseGroupId)) {
      groupSettings.set(exercise.exerciseGroupId, exercise);
    }
  }

  return {
    name: values.name,
    ...(values.description ? { description: values.description } : {}),
    ...(values.notes ? { notes: values.notes } : {}),
    exercises: values.exercises.map((exercise) => {
      const group = exercise.exerciseGroupId ? groupSettings.get(exercise.exerciseGroupId) : undefined;
      return {
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
        ...(exercise.maximumRecommendedRpe !== undefined
          ? { maximumRecommendedRpe: exercise.maximumRecommendedRpe }
          : {}),
        ...(exercise.notes ? { notes: exercise.notes } : {}),
        isActive: exercise.isActive,
        ...(exercise.exerciseGroupId ? {
          exerciseGroupId: exercise.exerciseGroupId,
          exerciseGroupType: group?.exerciseGroupType ?? 'superset',
          ...(group?.exerciseGroupName?.trim() ? { exerciseGroupName: group.exerciseGroupName.trim() } : {}),
          exerciseGroupRounds: group?.exerciseGroupRounds ?? 3,
          exerciseGroupRestBetweenExercisesSeconds: group?.exerciseGroupRestBetweenExercisesSeconds ?? 0,
          exerciseGroupRestBetweenRoundsSeconds: group?.exerciseGroupRestBetweenRoundsSeconds ?? 120,
        } : {}),
      };
    }),
  };
}
