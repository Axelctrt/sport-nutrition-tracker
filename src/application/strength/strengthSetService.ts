import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { EntityId, NewEntity } from '@/domain/models/common';
import type { StrengthSet, StrengthSetType, WorkoutSession, WorkoutSessionExercise } from '@/domain/models/strength';
import { resolveTrackingMode } from '@/domain/strength/strengthTracking';
import type { StrengthSetRepository } from '@/infrastructure/repositories/contracts/StrengthSetRepository';
import type { WorkoutSessionRepository } from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';

export interface StrengthSetChanges {
  repetitions: number;
  weightKg: number;
  durationSeconds?: number | undefined;
  distanceMeters?: number | undefined;
  rpe?: number | undefined;
  type: StrengthSetType;
  notes?: string | undefined;
}

async function getEditableContext(
  sessionRepository: WorkoutSessionRepository,
  sessionId: EntityId,
  sessionExerciseId: EntityId,
): Promise<{ session: WorkoutSession; exercise: WorkoutSessionExercise }> {
  const session = await sessionRepository.getById(sessionId);
  if (!session) throw new RepositoryError('Séance introuvable.', 'update');
  if (session.status !== 'inProgress') {
    throw new RepositoryError('Les séries d’une séance terminée ne peuvent plus être modifiées.', 'update');
  }
  const exercise = (await sessionRepository.listExercises(sessionId))
    .find((candidate) => candidate.id === sessionExerciseId);
  if (!exercise) throw new RepositoryError('Exercice de séance introuvable.', 'update');
  return { session, exercise };
}


type StrengthSetSeed = Pick<
  StrengthSet,
  'repetitions' | 'weightKg' | 'durationSeconds' | 'distanceMeters' | 'rpe' | 'notes' | 'type'
>;

function buildStrengthSetInput(
  sessionId: EntityId,
  exercise: WorkoutSessionExercise,
  setNumber: number,
  previous?: StrengthSetSeed,
  type: StrengthSetType = 'working',
): NewEntity<StrengthSet> {
  const trackingMode = resolveTrackingMode(exercise);
  return {
    sessionId,
    sessionExerciseId: exercise.id,
    setNumber,
    repetitions: trackingMode === 'duration' || trackingMode === 'distance'
      ? 0
      : previous?.repetitions ?? exercise.minRepetitions ?? 0,
    weightKg: trackingMode === 'repetitions' || trackingMode === 'duration' || trackingMode === 'distance'
      ? 0
      : previous?.weightKg ?? exercise.targetLoadKg ?? 0,
    ...(trackingMode === 'duration'
      ? { durationSeconds: previous?.durationSeconds ?? exercise.targetDurationSeconds ?? 0 }
      : {}),
    ...(trackingMode === 'distance'
      ? { distanceMeters: previous?.distanceMeters ?? exercise.targetDistanceMeters ?? 0 }
      : {}),
    ...(previous?.rpe === undefined ? {} : { rpe: previous.rpe }),
    type,
    isCompleted: false,
    ...(previous?.notes ? { notes: previous.notes } : {}),
  };
}

export async function ensurePlannedStrengthSetsForSession(
  sessionRepository: WorkoutSessionRepository,
  setRepository: StrengthSetRepository,
  sessionId: EntityId,
): Promise<StrengthSet[]> {
  const session = await sessionRepository.getById(sessionId);
  if (!session) throw new RepositoryError('Séance introuvable.', 'create');
  if (session.status !== 'inProgress') {
    throw new RepositoryError('Les séries prévues ne peuvent être préparées que pour une séance en cours.', 'create');
  }

  const [exercises, existingSets] = await Promise.all([
    sessionRepository.listExercises(sessionId),
    setRepository.listBySession(sessionId),
  ]);
  const setsToCreate: Array<NewEntity<StrengthSet>> = [];

  for (const exercise of exercises) {
    const plannedSets = exercise.plannedSets ?? 0;
    if (plannedSets <= 0) continue;

    const currentSets = existingSets
      .filter((set) => set.sessionExerciseId === exercise.id)
      .sort((left, right) => left.setNumber - right.setNumber);
    const currentWorkingSets = currentSets.filter((set) => set.type === 'working');
    let previousWorkingSet: StrengthSetSeed | undefined = currentWorkingSets.at(-1);
    let nextSetNumber = currentSets.length + 1;

    for (let index = currentWorkingSets.length; index < plannedSets; index += 1) {
      const input = buildStrengthSetInput(
        sessionId,
        exercise,
        nextSetNumber,
        previousWorkingSet,
        'working',
      );
      setsToCreate.push(input);
      previousWorkingSet = input;
      nextSetNumber += 1;
    }
  }

  if (setsToCreate.length === 0) return existingSets;
  const created = await setRepository.createMany(setsToCreate);
  return [...existingSets, ...created].sort((left, right) => {
    const exerciseComparison = left.sessionExerciseId.localeCompare(right.sessionExerciseId);
    return exerciseComparison === 0 ? left.setNumber - right.setNumber : exerciseComparison;
  });
}

export async function listStrengthSetsForSession(
  repository: StrengthSetRepository,
  sessionId: EntityId,
): Promise<StrengthSet[]> {
  return repository.listBySession(sessionId);
}

export async function addStrengthSet(
  sessionRepository: WorkoutSessionRepository,
  setRepository: StrengthSetRepository,
  sessionId: EntityId,
  sessionExerciseId: EntityId,
  historicalSeed?: StrengthSetSeed,
): Promise<StrengthSet> {
  const { exercise } = await getEditableContext(sessionRepository, sessionId, sessionExerciseId);
  const current = await setRepository.listBySessionExercise(sessionExerciseId);
  const previous = current.at(-1) ?? historicalSeed;

  return setRepository.create(buildStrengthSetInput(
    sessionId,
    exercise,
    current.length + 1,
    previous,
    previous?.type ?? 'working',
  ));
}

export async function updateStrengthSet(
  sessionRepository: WorkoutSessionRepository,
  setRepository: StrengthSetRepository,
  sessionId: EntityId,
  sessionExerciseId: EntityId,
  setId: EntityId,
  changes: StrengthSetChanges,
): Promise<StrengthSet> {
  await getEditableContext(sessionRepository, sessionId, sessionExerciseId);
  const current = await setRepository.getById(setId);
  if (!current || current.sessionId !== sessionId || current.sessionExerciseId !== sessionExerciseId) {
    throw new RepositoryError('Série introuvable.', 'update');
  }
  return setRepository.update(setId, {
    repetitions: changes.repetitions,
    weightKg: changes.weightKg,
    durationSeconds: changes.durationSeconds,
    distanceMeters: changes.distanceMeters,
    type: changes.type,
    ...(changes.rpe === undefined ? { rpe: undefined } : { rpe: changes.rpe }),
    notes: changes.notes?.trim() || undefined,
  });
}

export async function setStrengthSetCompletion(
  sessionRepository: WorkoutSessionRepository,
  setRepository: StrengthSetRepository,
  sessionId: EntityId,
  sessionExerciseId: EntityId,
  setId: EntityId,
  changes: StrengthSetChanges,
  isCompleted: boolean,
  now = new Date(),
): Promise<StrengthSet> {
  const updated = await updateStrengthSet(
    sessionRepository,
    setRepository,
    sessionId,
    sessionExerciseId,
    setId,
    changes,
  );
  return setRepository.update(updated.id, {
    isCompleted,
    completedAt: isCompleted ? now.toISOString() : undefined,
  });
}

export async function duplicateStrengthSet(
  sessionRepository: WorkoutSessionRepository,
  setRepository: StrengthSetRepository,
  sessionId: EntityId,
  sessionExerciseId: EntityId,
  setId: EntityId,
): Promise<StrengthSet> {
  await getEditableContext(sessionRepository, sessionId, sessionExerciseId);
  const source = await setRepository.getById(setId);
  if (!source || source.sessionId !== sessionId || source.sessionExerciseId !== sessionExerciseId) {
    throw new RepositoryError('Série introuvable.', 'create');
  }
  const current = await setRepository.listBySessionExercise(sessionExerciseId);
  return setRepository.create({
    sessionId,
    sessionExerciseId,
    setNumber: current.length + 1,
    repetitions: source.repetitions,
    weightKg: source.weightKg,
    ...(source.durationSeconds === undefined ? {} : { durationSeconds: source.durationSeconds }),
    ...(source.distanceMeters === undefined ? {} : { distanceMeters: source.distanceMeters }),
    ...(source.rpe === undefined ? {} : { rpe: source.rpe }),
    type: source.type,
    isCompleted: false,
    ...(source.notes ? { notes: source.notes } : {}),
  });
}

export async function deleteStrengthSet(
  sessionRepository: WorkoutSessionRepository,
  setRepository: StrengthSetRepository,
  sessionId: EntityId,
  sessionExerciseId: EntityId,
  setId: EntityId,
): Promise<StrengthSet[]> {
  await getEditableContext(sessionRepository, sessionId, sessionExerciseId);
  const current = await setRepository.getById(setId);
  if (!current || current.sessionId !== sessionId || current.sessionExerciseId !== sessionExerciseId) {
    throw new RepositoryError('Série introuvable.', 'delete');
  }
  return setRepository.deleteAndRenumber(sessionExerciseId, setId);
}
