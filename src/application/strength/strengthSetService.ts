import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { EntityId } from '@/domain/models/common';
import type { StrengthSet, StrengthSetType, WorkoutSession, WorkoutSessionExercise } from '@/domain/models/strength';
import type { StrengthSetRepository } from '@/infrastructure/repositories/contracts/StrengthSetRepository';
import type { WorkoutSessionRepository } from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';

export interface StrengthSetChanges {
  repetitions: number;
  weightKg: number;
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
): Promise<StrengthSet> {
  const { exercise } = await getEditableContext(sessionRepository, sessionId, sessionExerciseId);
  const current = await setRepository.listBySessionExercise(sessionExerciseId);
  const previous = current.at(-1);

  return setRepository.create({
    sessionId,
    sessionExerciseId,
    setNumber: current.length + 1,
    repetitions: previous?.repetitions ?? exercise.minRepetitions ?? 0,
    weightKg: previous?.weightKg ?? exercise.targetLoadKg ?? 0,
    ...(previous?.rpe === undefined ? {} : { rpe: previous.rpe }),
    type: previous?.type ?? 'working',
    isCompleted: false,
    ...(previous?.notes ? { notes: previous.notes } : {}),
  });
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
