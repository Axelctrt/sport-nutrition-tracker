import type {
  StrengthSet,
  WorkoutSessionExercise,
} from '@/domain/models/strength';

export type StrengthProgressionIneligibilityReason =
  | 'incompleteSnapshot'
  | 'notEnoughWorkingSets'
  | 'incompleteWorkingSet'
  | 'repetitionRangeNotCompleted'
  | 'rpeNotEligible'
  | 'invalidCurrentLoad';

export type StrengthProgressionEvaluation =
  | {
      eligible: true;
      plannedWorkingSets: StrengthSet[];
      currentLoadKg: number;
      suggestedLoadKg: number;
      incrementKg: number;
    }
  | {
      eligible: false;
      plannedWorkingSets: StrengthSet[];
      reason: StrengthProgressionIneligibilityReason;
    };

export function roundStrengthLoad(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function evaluateStrengthProgressionEligibility(
  exercise: WorkoutSessionExercise,
  sets: StrengthSet[],
): StrengthProgressionEvaluation {
  if (
    exercise.loadUnitSnapshot !== 'kg'
    || exercise.plannedSets === undefined
    || exercise.maxRepetitions === undefined
    || exercise.loadIncrementKg === undefined
    || exercise.loadIncrementKg <= 0
    || !exercise.sourceTemplateExerciseId
  ) {
    return { eligible: false, plannedWorkingSets: [], reason: 'incompleteSnapshot' };
  }

  const workingSets = sets
    .filter((set) => set.type === 'working')
    .sort((left, right) => left.setNumber - right.setNumber);
  if (workingSets.length < exercise.plannedSets) {
    return { eligible: false, plannedWorkingSets: workingSets, reason: 'notEnoughWorkingSets' };
  }

  const plannedWorkingSets = workingSets.slice(0, exercise.plannedSets);
  if (plannedWorkingSets.some((set) => !set.isCompleted)) {
    return { eligible: false, plannedWorkingSets, reason: 'incompleteWorkingSet' };
  }
  if (plannedWorkingSets.some((set) => set.repetitions < exercise.maxRepetitions!)) {
    return {
      eligible: false,
      plannedWorkingSets,
      reason: 'repetitionRangeNotCompleted',
    };
  }
  if (
    exercise.maximumRecommendedRpe !== undefined
    && plannedWorkingSets.some((set) => (
      set.rpe === undefined || set.rpe > exercise.maximumRecommendedRpe!
    ))
  ) {
    return { eligible: false, plannedWorkingSets, reason: 'rpeNotEligible' };
  }

  const minimumPerformedLoad = Math.min(...plannedWorkingSets.map((set) => set.weightKg));
  const currentLoadKg = roundStrengthLoad(
    Math.max(exercise.targetLoadKg ?? 0, minimumPerformedLoad),
  );
  if (
    currentLoadKg <= 0
    || plannedWorkingSets.some((set) => set.weightKg < currentLoadKg)
  ) {
    return { eligible: false, plannedWorkingSets, reason: 'invalidCurrentLoad' };
  }

  return {
    eligible: true,
    plannedWorkingSets,
    currentLoadKg,
    suggestedLoadKg: roundStrengthLoad(currentLoadKg + exercise.loadIncrementKg),
    incrementKg: exercise.loadIncrementKg,
  };
}
