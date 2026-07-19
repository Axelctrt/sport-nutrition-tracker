import type { StrengthSet, WorkoutSessionExercise } from '@/domain/models/strength';

export interface WorkoutSessionNextStep {
  exerciseId: string;
  exerciseName: string;
  setId?: string;
  setNumber: number;
}

export interface WorkoutExerciseProgress {
  completedSetCount: number;
  totalSetCount: number;
  isComplete: boolean;
  nextStep?: WorkoutSessionNextStep;
}

export interface WorkoutSessionProgress {
  completedExerciseCount: number;
  exerciseCount: number;
  completedSetCount: number;
  totalSetCount: number;
  remainingSetCount: number;
  incompleteExerciseCount: number;
  percentage: number;
  isComplete: boolean;
  nextStep?: WorkoutSessionNextStep;
}

interface InternalExerciseProgress extends WorkoutExerciseProgress {
  targetSets: StrengthSet[];
}

function trackedTargetSets(
  exercise: WorkoutSessionExercise,
  sets: readonly StrengthSet[],
): StrengthSet[] {
  const orderedSets = [...sets].sort((left, right) => left.setNumber - right.setNumber);
  return exercise.plannedSets === undefined
    ? orderedSets
    : orderedSets.filter((set) => set.type === 'working');
}

function internalExerciseProgress(
  exercise: WorkoutSessionExercise,
  sets: readonly StrengthSet[],
): InternalExerciseProgress {
  const targetSets = trackedTargetSets(exercise, sets);
  const completedSetCount = targetSets.filter((set) => set.isCompleted).length;
  const totalSetCount = targetSets.length;
  const isComplete = totalSetCount > 0
    ? completedSetCount >= totalSetCount
    : exercise.plannedSets === 0;
  const pendingSet = targetSets.find((set) => !set.isCompleted);
  const highestSetNumber = [...sets].reduce(
    (highest, set) => Math.max(highest, set.setNumber),
    0,
  );

  return {
    completedSetCount,
    totalSetCount,
    isComplete,
    targetSets,
    ...(pendingSet
      ? {
          nextStep: {
            exerciseId: exercise.id,
            exerciseName: exercise.exerciseNameSnapshot,
            setId: pendingSet.id,
            setNumber: pendingSet.setNumber,
          },
        }
      : !isComplete
        ? {
            nextStep: {
              exerciseId: exercise.id,
              exerciseName: exercise.exerciseNameSnapshot,
              setNumber: highestSetNumber + 1,
            },
          }
        : {}),
  };
}

export function buildWorkoutExerciseProgress(
  exercise: WorkoutSessionExercise,
  sets: readonly StrengthSet[],
): WorkoutExerciseProgress {
  const { targetSets: _targetSets, ...progress } = internalExerciseProgress(exercise, sets);
  return progress;
}

function executionUnits(
  exercises: readonly WorkoutSessionExercise[],
): WorkoutSessionExercise[][] {
  const ordered = [...exercises].sort((left, right) => left.sortOrder - right.sortOrder);
  const grouped = new Map<string, WorkoutSessionExercise[]>();
  for (const exercise of ordered) {
    if (!exercise.exerciseGroupId) continue;
    const members = grouped.get(exercise.exerciseGroupId) ?? [];
    members.push(exercise);
    grouped.set(exercise.exerciseGroupId, members);
  }

  const seenGroups = new Set<string>();
  const units: WorkoutSessionExercise[][] = [];
  for (const exercise of ordered) {
    const groupId = exercise.exerciseGroupId;
    if (!groupId) {
      units.push([exercise]);
      continue;
    }
    if (seenGroups.has(groupId)) continue;
    seenGroups.add(groupId);
    units.push(grouped.get(groupId) ?? [exercise]);
  }
  return units;
}

function nextStepForUnit(
  unit: readonly WorkoutSessionExercise[],
  progressByExercise: ReadonlyMap<string, InternalExerciseProgress>,
): WorkoutSessionNextStep | undefined {
  if (unit.length === 1 && !unit[0]?.exerciseGroupId) {
    return progressByExercise.get(unit[0]!.id)?.nextStep;
  }

  const maximumRoundCount = unit.reduce(
    (maximum, exercise) => Math.max(
      maximum,
      progressByExercise.get(exercise.id)?.targetSets.length ?? 0,
    ),
    0,
  );

  for (let roundIndex = 0; roundIndex < maximumRoundCount; roundIndex += 1) {
    for (const exercise of unit) {
      const targetSet = progressByExercise.get(exercise.id)?.targetSets[roundIndex];
      if (!targetSet || targetSet.isCompleted) continue;
      return {
        exerciseId: exercise.id,
        exerciseName: exercise.exerciseNameSnapshot,
        setId: targetSet.id,
        setNumber: targetSet.setNumber,
      };
    }
  }

  return unit
    .map((exercise) => progressByExercise.get(exercise.id)?.nextStep)
    .find((step): step is WorkoutSessionNextStep => step !== undefined);
}

export function buildWorkoutSessionProgress(
  exercises: readonly WorkoutSessionExercise[],
  sets: readonly StrengthSet[],
): WorkoutSessionProgress {
  const setsByExercise = new Map<string, StrengthSet[]>();
  for (const set of sets) {
    const current = setsByExercise.get(set.sessionExerciseId) ?? [];
    current.push(set);
    setsByExercise.set(set.sessionExerciseId, current);
  }

  const progressByExercise = new Map<string, InternalExerciseProgress>();
  let completedExerciseCount = 0;
  let completedSetCount = 0;
  let totalSetCount = 0;

  for (const exercise of exercises) {
    const progress = internalExerciseProgress(exercise, setsByExercise.get(exercise.id) ?? []);
    progressByExercise.set(exercise.id, progress);
    completedSetCount += progress.completedSetCount;
    totalSetCount += progress.totalSetCount;
    if (progress.isComplete) completedExerciseCount += 1;
  }

  let nextStep: WorkoutSessionNextStep | undefined;
  for (const unit of executionUnits(exercises)) {
    const candidate = nextStepForUnit(unit, progressByExercise);
    if (candidate) {
      nextStep = candidate;
      break;
    }
  }

  const exerciseCount = exercises.length;
  const isComplete = exerciseCount > 0 && completedExerciseCount === exerciseCount;
  const rawPercentage = totalSetCount > 0
    ? (completedSetCount / totalSetCount) * 100
    : exerciseCount > 0
      ? (completedExerciseCount / exerciseCount) * 100
      : 0;

  return {
    completedExerciseCount,
    exerciseCount,
    completedSetCount,
    totalSetCount,
    remainingSetCount: Math.max(0, totalSetCount - completedSetCount),
    incompleteExerciseCount: Math.max(0, exerciseCount - completedExerciseCount),
    percentage: Math.min(100, Math.max(0, Math.round(rawPercentage))),
    isComplete,
    ...(nextStep ? { nextStep } : {}),
  };
}
