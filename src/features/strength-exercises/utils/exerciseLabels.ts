import type {
  ExerciseCategory,
  ExerciseEquipment,
  ExerciseSource,
  LoadUnit,
  MovementType,
  MuscleGroup,
} from '@/domain/models/strength';

export const muscleGroupOptions: readonly { value: MuscleGroup; label: string }[] = [
  { value: 'pectorals', label: 'Pectoraux' },
  { value: 'back', label: 'Dos' },
  { value: 'shoulders', label: 'Épaules' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'quadriceps', label: 'Quadriceps' },
  { value: 'hamstrings', label: 'Ischio-jambiers' },
  { value: 'glutes', label: 'Fessiers' },
  { value: 'calves', label: 'Mollets' },
  { value: 'abdominals', label: 'Abdominaux' },
  { value: 'lowerBack', label: 'Lombaires' },
  { value: 'fullBody', label: 'Corps entier' },
  { value: 'other', label: 'Autre' },
];

export const equipmentOptions: readonly { value: ExerciseEquipment; label: string }[] = [
  { value: 'barbell', label: 'Barre' },
  { value: 'dumbbells', label: 'Haltères' },
  { value: 'machine', label: 'Machine' },
  { value: 'cable', label: 'Poulie' },
  { value: 'bodyweight', label: 'Poids du corps' },
  { value: 'resistanceBand', label: 'Élastique' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'other', label: 'Autre' },
];

export const exerciseCategoryOptions: readonly { value: ExerciseCategory; label: string }[] = [
  { value: 'strength', label: 'Musculation' },
  { value: 'bodyweight', label: 'Poids du corps' },
  { value: 'conditioning', label: 'Conditionnement' },
  { value: 'mobility', label: 'Mobilité' },
  { value: 'other', label: 'Autre' },
];

export const movementTypeOptions: readonly { value: MovementType; label: string }[] = [
  { value: 'compound', label: 'Polyarticulaire' },
  { value: 'isolation', label: 'Isolation' },
  { value: 'core', label: 'Gainage / sangle abdominale' },
  { value: 'carry', label: 'Porté / déplacement chargé' },
  { value: 'other', label: 'Autre' },
];

export const loadUnitOptions: readonly { value: LoadUnit; label: string }[] = [
  { value: 'kg', label: 'Kilogrammes' },
  { value: 'bodyweight', label: 'Poids du corps' },
  { value: 'assistedKg', label: 'Assistance en kilogrammes' },
  { value: 'none', label: 'Sans charge' },
];

function labelFor<T extends string>(
  options: readonly { value: T; label: string }[],
  value: T,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export const muscleGroupLabel = (value: MuscleGroup) => labelFor(muscleGroupOptions, value);
export const equipmentLabel = (value: ExerciseEquipment) => labelFor(equipmentOptions, value);
export const exerciseCategoryLabel = (value: ExerciseCategory) => labelFor(exerciseCategoryOptions, value);
export const movementTypeLabel = (value: MovementType) => labelFor(movementTypeOptions, value);
export const loadUnitLabel = (value: LoadUnit) => labelFor(loadUnitOptions, value);
export const exerciseSourceLabel = (value: ExerciseSource) => value === 'catalog' ? 'Catalogue système' : 'Exercice personnel';
