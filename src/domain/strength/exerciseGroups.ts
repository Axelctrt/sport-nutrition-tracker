import type {
  ExerciseGroupType,
  WorkoutSessionExercise,
  WorkoutTemplateExercise,
} from '@/domain/models/strength';

export interface ExerciseGroupMetadata {
  id: string;
  type: ExerciseGroupType;
  name?: string;
  rounds: number;
  restBetweenExercisesSeconds: number;
  restBetweenRoundsSeconds: number;
}

export interface ExerciseGroupView<T> extends ExerciseGroupMetadata {
  exercises: T[];
  letter: string;
  label: string;
}

type GroupableExercise = Pick<
  WorkoutTemplateExercise | WorkoutSessionExercise,
  | 'sortOrder'
  | 'exerciseGroupId'
  | 'exerciseGroupType'
  | 'exerciseGroupName'
  | 'exerciseGroupRounds'
  | 'exerciseGroupRestBetweenExercisesSeconds'
  | 'exerciseGroupRestBetweenRoundsSeconds'
>;

export function exerciseGroupTypeLabel(type: ExerciseGroupType): string {
  if (type === 'superset') return 'Superset';
  if (type === 'triSet') return 'Tri-set';
  return 'Circuit';
}

export function exerciseGroupLetter(index: number): string {
  const normalized = Math.max(0, index);
  return String.fromCharCode(65 + (normalized % 26));
}

export function buildExerciseGroups<T extends GroupableExercise>(exercises: T[]): ExerciseGroupView<T>[] {
  const groups = new Map<string, T[]>();
  for (const exercise of [...exercises].sort((left, right) => left.sortOrder - right.sortOrder)) {
    if (!exercise.exerciseGroupId) continue;
    const current = groups.get(exercise.exerciseGroupId) ?? [];
    current.push(exercise);
    groups.set(exercise.exerciseGroupId, current);
  }

  return [...groups.entries()].map(([id, members], index) => {
    const first = members[0]!;
    const type = first.exerciseGroupType ?? 'superset';
    const letter = exerciseGroupLetter(index);
    return {
      id,
      type,
      ...(first.exerciseGroupName ? { name: first.exerciseGroupName } : {}),
      rounds: first.exerciseGroupRounds ?? 3,
      restBetweenExercisesSeconds: first.exerciseGroupRestBetweenExercisesSeconds ?? 0,
      restBetweenRoundsSeconds: first.exerciseGroupRestBetweenRoundsSeconds ?? 120,
      exercises: members,
      letter,
      label: first.exerciseGroupName?.trim() || `${exerciseGroupTypeLabel(type)} ${letter}`,
    };
  });
}

export function exerciseGroupPosition<T extends GroupableExercise>(
  exercise: T,
  groups: ExerciseGroupView<T>[],
): { group: ExerciseGroupView<T>; position: number } | undefined {
  if (!exercise.exerciseGroupId) return undefined;
  const group = groups.find((candidate) => candidate.id === exercise.exerciseGroupId);
  if (!group) return undefined;
  const position = group.exercises.indexOf(exercise);
  return position < 0 ? undefined : { group, position };
}

export function groupRestAfterExercise<T extends GroupableExercise>(
  exercise: T,
  groups: ExerciseGroupView<T>[],
): { durationSeconds: number; nextExercise: T | undefined; betweenRounds: boolean } | undefined {
  const position = exerciseGroupPosition(exercise, groups);
  if (!position) return undefined;
  const nextExercise = position.group.exercises[position.position + 1];
  if (nextExercise) {
    return {
      durationSeconds: position.group.restBetweenExercisesSeconds,
      nextExercise,
      betweenRounds: false,
    };
  }
  return {
    durationSeconds: position.group.restBetweenRoundsSeconds,
    nextExercise: position.group.exercises[0],
    betweenRounds: true,
  };
}
