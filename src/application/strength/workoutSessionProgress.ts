import type { StrengthSet, WorkoutSessionExercise } from '@/domain/models/strength';

export interface WorkoutSessionNextStep {
  exerciseId: string;
  exerciseName: string;
  setId?: string;
  setNumber: number;
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

interface ExerciseProgress {
  completedSetCount: number;
  totalSetCount: number;
  isComplete: boolean;
  nextStep?: WorkoutSessionNextStep;
}

function exerciseProgress(
  exercise: WorkoutSessionExercise,
  sets: readonly StrengthSet[],
): ExerciseProgress {
  const orderedSets = [...sets].sort((left, right) => left.setNumber - right.setNumber);
  const trackedSets = exercise.plannedSets === undefined
    ? orderedSets
    : orderedSets.filter((set) => set.type === 'working');
  const completedSetCount = trackedSets.filter((set) => set.isCompleted).length;
  const totalSetCount = exercise.plannedSets ?? trackedSets.length;
  const isComplete = totalSetCount > 0 && completedSetCount >= totalSetCount;

  if (isComplete) {
    return { completedSetCount, totalSetCount, isComplete };
  }

  const pendingSet = trackedSets.find((set) => !set.isCompleted);
  if (pendingSet) {
    return {
      completedSetCount,
      totalSetCount,
      isComplete,
      nextStep: {
        exerciseId: exercise.id,
        exerciseName: exercise.exerciseNameSnapshot,
        setId: pendingSet.id,
        setNumber: pendingSet.setNumber,
      },
    };
  }

  const highestSetNumber = orderedSets.reduce(
    (highest, set) => Math.max(highest, set.setNumber),
    0,
  );

  return {
    completedSetCount,
    totalSetCount,
    isComplete,
    nextStep: {
      exerciseId: exercise.id,
      exerciseName: exercise.exerciseNameSnapshot,
      setNumber: highestSetNumber + 1,
    },
  };
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

  let completedExerciseCount = 0;
  let completedSetCount = 0;
  let totalSetCount = 0;
  let nextStep: WorkoutSessionNextStep | undefined;

  for (const exercise of exercises) {
    const progress = exerciseProgress(exercise, setsByExercise.get(exercise.id) ?? []);
    completedSetCount += progress.completedSetCount;
    totalSetCount += progress.totalSetCount;
    if (progress.isComplete) completedExerciseCount += 1;
    if (!nextStep && progress.nextStep) nextStep = progress.nextStep;
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
