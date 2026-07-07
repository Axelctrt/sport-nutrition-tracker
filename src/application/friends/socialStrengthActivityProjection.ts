import {
  hasCommonSocialActivityField,
  hasStrengthSocialActivityField,
  isPublishableSocialActivityPolicy,
  type SocialActivityProjectionIdentity,
} from '@/application/friends/socialActivityProjectionSupport';
import { createActiveSocialActivitySnapshotV2 } from '@/domain/friends/socialActivitySnapshotFactory';
import type {
  ActiveSocialActivitySnapshot,
  SocialActivitySnapshotSummary,
  SocialStrengthActivitySnapshotDetail,
  SocialStrengthExerciseSnapshot,
  SocialStrengthSetSnapshot,
} from '@/domain/friends/socialActivitySnapshotContract';
import type { EntityId } from '@/domain/models/common';
import type {
  ExerciseDefinition,
  MuscleGroup,
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
} from '@/domain/models/strength';

export interface CompletedStrengthSessionSocialProjectionInput
  extends SocialActivityProjectionIdentity {
  readonly session: WorkoutSession;
  readonly exercises: readonly WorkoutSessionExercise[];
  readonly sets: readonly StrengthSet[];
  readonly exerciseDefinitions?: readonly ExerciseDefinition[];
}

function latestRevision(
  session: WorkoutSession,
  exercises: readonly WorkoutSessionExercise[],
  sets: readonly StrengthSet[],
  definitions: readonly ExerciseDefinition[] | undefined,
): string {
  const definitionIds = new Set(exercises.map((exercise) => exercise.exerciseDefinitionId));
  const definitionRevisions = (definitions ?? [])
    .filter((definition) => definitionIds.has(definition.id))
    .map((definition) => definition.updatedAt);

  return [
    session.updatedAt,
    ...exercises.map((exercise) => exercise.updatedAt),
    ...sets.map((set) => set.updatedAt),
    ...definitionRevisions,
  ]
    .sort((left, right) => left.localeCompare(right))
    .at(-1) ?? session.updatedAt;
}

function sessionExercises(
  session: WorkoutSession,
  exercises: readonly WorkoutSessionExercise[],
): readonly WorkoutSessionExercise[] {
  return exercises
    .filter((exercise) => exercise.sessionId === session.id)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function completedSessionSets(
  session: WorkoutSession,
  sets: readonly StrengthSet[],
): readonly StrengthSet[] {
  return sets
    .filter((set) => set.sessionId === session.id && set.isCompleted)
    .sort((left, right) => {
      const exerciseComparison = left.sessionExerciseId.localeCompare(right.sessionExerciseId);
      return exerciseComparison === 0 ? left.setNumber - right.setNumber : exerciseComparison;
    });
}

function exerciseDefinitionMap(
  definitions: readonly ExerciseDefinition[] | undefined,
): ReadonlyMap<EntityId, ExerciseDefinition> {
  return new Map((definitions ?? []).map((definition) => [definition.id, definition]));
}

function exerciseMuscleGroups(
  exercise: WorkoutSessionExercise,
  definitions: ReadonlyMap<EntityId, ExerciseDefinition>,
): readonly MuscleGroup[] | undefined {
  const definition = definitions.get(exercise.exerciseDefinitionId);
  if (!definition) return undefined;
  return [...new Set([definition.primaryMuscleGroup, ...definition.secondaryMuscleGroups])];
}

function allMuscleGroups(
  exercises: readonly WorkoutSessionExercise[],
  definitions: ReadonlyMap<EntityId, ExerciseDefinition>,
): readonly MuscleGroup[] {
  return [...new Set(exercises.flatMap((exercise) => (
    exerciseMuscleGroups(exercise, definitions) ?? []
  )))];
}

function strengthSetSnapshot(
  set: StrengthSet,
  exercise: WorkoutSessionExercise,
  policy: CompletedStrengthSessionSocialProjectionInput['policy'],
): SocialStrengthSetSnapshot {
  const includeLoads = hasStrengthSocialActivityField(policy, 'loads');
  const includeBodyweight = hasStrengthSocialActivityField(policy, 'bodyweight');
  const includeLoadUnit = exercise.loadUnitSnapshot === 'bodyweight'
    ? includeBodyweight
    : includeLoads;
  const includeNumericLoad = includeLoads
    && exercise.loadUnitSnapshot !== 'bodyweight'
    && exercise.loadUnitSnapshot !== 'none';

  return {
    setNumber: set.setNumber,
    type: set.type,
    ...(hasStrengthSocialActivityField(policy, 'repetitions')
      ? { repetitions: set.repetitions }
      : {}),
    ...(includeNumericLoad ? { loadKg: set.weightKg } : {}),
    ...(includeLoadUnit ? { loadUnit: exercise.loadUnitSnapshot } : {}),
    ...(hasStrengthSocialActivityField(policy, 'rpe') && set.rpe !== undefined
      ? { rpe: set.rpe }
      : {}),
  };
}

function strengthExerciseSnapshots(
  exercises: readonly WorkoutSessionExercise[],
  sets: readonly StrengthSet[],
  definitions: ReadonlyMap<EntityId, ExerciseDefinition>,
  policy: CompletedStrengthSessionSocialProjectionInput['policy'],
): readonly SocialStrengthExerciseSnapshot[] | undefined {
  if (!hasStrengthSocialActivityField(policy, 'exercises')) return undefined;
  const includeSets = hasStrengthSocialActivityField(policy, 'sets');

  return exercises.map((exercise) => {
    const exerciseSets = sets.filter((set) => set.sessionExerciseId === exercise.id);
    const muscleGroups = hasStrengthSocialActivityField(policy, 'muscleGroups')
      ? exerciseMuscleGroups(exercise, definitions)
      : undefined;

    return {
      name: exercise.exerciseNameSnapshot,
      ...(muscleGroups && muscleGroups.length > 0 ? { muscleGroups } : {}),
      ...(exercise.trackingModeSnapshot
        ? { trackingMode: exercise.trackingModeSnapshot }
        : {}),
      ...(includeSets
        ? { sets: exerciseSets.map((set) => strengthSetSnapshot(set, exercise, policy)) }
        : {}),
    };
  });
}

function strengthVolumeKg(
  exercises: readonly WorkoutSessionExercise[],
  sets: readonly StrengthSet[],
): number {
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  return sets.reduce((total, set) => {
    const exercise = exerciseById.get(set.sessionExerciseId);
    if (exercise?.loadUnitSnapshot !== 'kg') return total;
    return total + (set.weightKg * set.repetitions);
  }, 0);
}

export function projectCompletedStrengthSessionToSocialSnapshotV2(
  input: CompletedStrengthSessionSocialProjectionInput,
): ActiveSocialActivitySnapshot | undefined {
  if (!isPublishableSocialActivityPolicy(input.policy)) return undefined;
  if (input.session.status !== 'completed') return undefined;

  const exercises = sessionExercises(input.session, input.exercises);
  const sets = completedSessionSets(input.session, input.sets);
  const definitions = exerciseDefinitionMap(input.exerciseDefinitions);
  const muscleGroups = allMuscleGroups(exercises, definitions);
  const sessionName = input.session.sourceTemplateNameSnapshot;
  const projectedExercises = strengthExerciseSnapshots(
    exercises,
    sets,
    definitions,
    input.policy,
  );
  const summary: SocialActivitySnapshotSummary = {
    ...(hasCommonSocialActivityField(input.policy, 'duration')
      && input.session.durationMinutes !== undefined
      ? { durationMinutes: input.session.durationMinutes }
      : {}),
    ...(hasStrengthSocialActivityField(input.policy, 'exerciseCount')
      ? { exerciseCount: exercises.length }
      : {}),
    ...(hasStrengthSocialActivityField(input.policy, 'muscleGroups')
      && muscleGroups.length > 0
      ? { muscleGroups }
      : {}),
    ...(hasStrengthSocialActivityField(input.policy, 'volume')
      ? { volumeKg: strengthVolumeKg(exercises, sets) }
      : {}),
  };
  const detail: SocialStrengthActivitySnapshotDetail = {
    family: 'strength',
    ...(hasStrengthSocialActivityField(input.policy, 'sessionName') && sessionName
      ? { sessionName }
      : {}),
    ...(projectedExercises === undefined ? {} : { exercises: projectedExercises }),
  };
  const revision = latestRevision(input.session, exercises, sets, input.exerciseDefinitions);

  return createActiveSocialActivitySnapshotV2({
    ownerUserId: input.ownerUserId,
    recipientUserId: input.recipientUserId,
    sourceKind: 'strengthSession',
    sourceActivityId: input.session.id,
    sourceRevision: revision,
    visibility: input.policy.visibility,
    family: 'strength',
    activityType: 'strengthTraining',
    ...(sessionName && hasCommonSocialActivityField(input.policy, 'title')
      ? { title: sessionName }
      : {}),
    occurredOn: input.session.date,
    ...(input.session.startedAt && hasCommonSocialActivityField(input.policy, 'time')
      ? { occurredAt: input.session.startedAt }
      : {}),
    allowedFields: input.policy.fields,
    summary,
    ...(input.policy.visibility === 'summary' ? {} : { detail }),
    createdAt: input.session.createdAt,
    updatedAt: revision,
  });
}
