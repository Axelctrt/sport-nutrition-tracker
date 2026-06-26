import type { NewEntity } from '@/domain/models/common';
import type { ExerciseDefinition } from '@/domain/models/strength';
import {
  defaultTrackingModeForLoadUnit,
  loadUnitForTrackingMode,
} from '@/domain/strength/strengthTracking';
import type { StrengthExerciseFormValues } from '@/features/strength-exercises/schemas/strengthExerciseSchema';

export const defaultStrengthExerciseFormValues: StrengthExerciseFormValues = {
  name: '',
  primaryMuscleGroup: 'pectorals',
  secondaryMuscleGroups: [],
  equipment: 'barbell',
  category: 'strength',
  movementType: 'compound',
  trackingMode: 'loadRepetitions',
  description: '',
};

export function exerciseToFormValues(exercise: ExerciseDefinition): StrengthExerciseFormValues {
  return {
    name: exercise.name,
    primaryMuscleGroup: exercise.primaryMuscleGroup,
    secondaryMuscleGroups: [...exercise.secondaryMuscleGroups],
    equipment: exercise.equipment,
    category: exercise.category,
    movementType: exercise.movementType,
    trackingMode: exercise.trackingMode ?? defaultTrackingModeForLoadUnit(exercise.loadUnit),
    description: exercise.description ?? '',
  };
}

export function formValuesToExerciseInput(
  values: StrengthExerciseFormValues,
): Omit<NewEntity<ExerciseDefinition>, 'source' | 'isArchived'> {
  const description = values.description.trim();
  return {
    name: values.name.trim(),
    primaryMuscleGroup: values.primaryMuscleGroup,
    secondaryMuscleGroups: values.secondaryMuscleGroups.filter(
      (group) => group !== values.primaryMuscleGroup,
    ),
    equipment: values.equipment,
    category: values.category,
    movementType: values.movementType,
    loadUnit: loadUnitForTrackingMode(values.trackingMode),
    trackingMode: values.trackingMode,
    ...(description.length > 0 ? { description } : {}),
  };
}
