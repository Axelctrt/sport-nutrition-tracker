import type {
  LoadUnit,
  StrengthSet,
  StrengthTrackingMode,
  WorkoutSessionExercise,
} from '@/domain/models/strength';

export function defaultTrackingModeForLoadUnit(loadUnit: LoadUnit): StrengthTrackingMode {
  switch (loadUnit) {
    case 'kg':
      return 'loadRepetitions';
    case 'bodyweight':
      return 'bodyweightRepetitions';
    case 'assistedKg':
      return 'assistedRepetitions';
    case 'none':
      return 'repetitions';
  }
}

export function loadUnitForTrackingMode(mode: StrengthTrackingMode): LoadUnit {
  switch (mode) {
    case 'loadRepetitions':
      return 'kg';
    case 'bodyweightRepetitions':
      return 'bodyweight';
    case 'assistedRepetitions':
      return 'assistedKg';
    case 'repetitions':
    case 'duration':
    case 'distance':
      return 'none';
  }
}

export function resolveTrackingMode(
  source: Pick<WorkoutSessionExercise, 'loadUnitSnapshot' | 'trackingModeSnapshot'>,
): StrengthTrackingMode {
  return source.trackingModeSnapshot ?? defaultTrackingModeForLoadUnit(source.loadUnitSnapshot);
}

export function calculateEffectiveLoadKg(
  mode: StrengthTrackingMode,
  enteredLoadKg: number,
  bodyWeightKg?: number,
): number | undefined {
  switch (mode) {
    case 'loadRepetitions':
      return enteredLoadKg;
    case 'bodyweightRepetitions':
      return bodyWeightKg === undefined ? undefined : bodyWeightKg + enteredLoadKg;
    case 'assistedRepetitions':
      return bodyWeightKg === undefined ? undefined : Math.max(0, bodyWeightKg - enteredLoadKg);
    case 'repetitions':
    case 'duration':
    case 'distance':
      return undefined;
  }
}

export function calculateSetVolumeKg(
  set: Pick<StrengthSet, 'weightKg' | 'repetitions'>,
  mode: StrengthTrackingMode,
  bodyWeightKg?: number,
): number | undefined {
  const effectiveLoad = calculateEffectiveLoadKg(mode, set.weightKg, bodyWeightKg);
  return effectiveLoad === undefined ? undefined : effectiveLoad * set.repetitions;
}

export function calculateAdditionalVolumeKg(
  set: Pick<StrengthSet, 'weightKg' | 'repetitions'>,
  mode: StrengthTrackingMode,
): number | undefined {
  if (mode !== 'bodyweightRepetitions') return undefined;
  return set.weightKg * set.repetitions;
}

export function primarySetValue(
  set: Pick<StrengthSet, 'repetitions' | 'durationSeconds' | 'distanceMeters'>,
  mode: StrengthTrackingMode,
): number {
  switch (mode) {
    case 'duration':
      return set.durationSeconds ?? 0;
    case 'distance':
      return set.distanceMeters ?? 0;
    case 'loadRepetitions':
    case 'bodyweightRepetitions':
    case 'assistedRepetitions':
    case 'repetitions':
      return set.repetitions;
  }
}
