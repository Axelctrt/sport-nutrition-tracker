import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { EntityId, NewEntity } from '@/domain/models/common';
import type {
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
} from '@/domain/models/strength';
import type { StrengthSetRepository } from '@/infrastructure/repositories/contracts/StrengthSetRepository';
import type { WorkoutSessionRepository } from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';

export interface ExerciseHistoryEntry {
  session: WorkoutSession;
  sessionExercise: WorkoutSessionExercise;
  sets: StrengthSet[];
  workingSets: StrengthSet[];
  totalVolumeKg: number;
}

function sessionTimestamp(session: WorkoutSession): string {
  return session.completedAt ?? session.startedAt ?? session.date;
}

export function calculateStrengthSetVolume(set: StrengthSet): number {
  return set.weightKg * set.repetitions;
}

export function calculateExerciseVolume(sets: StrengthSet[]): number {
  return sets
    .filter((set) => set.isCompleted && set.type !== 'warmup')
    .reduce((total, set) => total + calculateStrengthSetVolume(set), 0);
}

export async function listExerciseHistory(
  sessionRepository: WorkoutSessionRepository,
  setRepository: StrengthSetRepository,
  exerciseDefinitionId: EntityId,
): Promise<ExerciseHistoryEntry[]> {
  const sessions = (await sessionRepository.listAll())
    .filter((session) => session.status === 'completed')
    .sort((left, right) => sessionTimestamp(right).localeCompare(sessionTimestamp(left)));

  const entries: ExerciseHistoryEntry[] = [];

  for (const session of sessions) {
    const sessionExercise = (await sessionRepository.listExercises(session.id))
      .find((exercise) => exercise.exerciseDefinitionId === exerciseDefinitionId);
    if (!sessionExercise) continue;

    const sets = (await setRepository.listBySessionExercise(sessionExercise.id))
      .filter((set) => set.isCompleted)
      .sort((left, right) => left.setNumber - right.setNumber);
    if (sets.length === 0) continue;

    const workingSets = sets.filter((set) => set.type !== 'warmup');
    entries.push({
      session,
      sessionExercise,
      sets,
      workingSets,
      totalVolumeKg: calculateExerciseVolume(sets),
    });
  }

  return entries;
}

export async function getPreviousExercisePerformance(
  sessionRepository: WorkoutSessionRepository,
  setRepository: StrengthSetRepository,
  currentSessionId: EntityId,
  exerciseDefinitionId: EntityId,
): Promise<ExerciseHistoryEntry | undefined> {
  const currentSession = await sessionRepository.getById(currentSessionId);
  if (!currentSession) throw new RepositoryError('Séance introuvable.', 'read');
  const currentTimestamp = sessionTimestamp(currentSession);
  const history = await listExerciseHistory(sessionRepository, setRepository, exerciseDefinitionId);
  return history.find((entry) => (
    entry.session.id !== currentSessionId
    && sessionTimestamp(entry.session) < currentTimestamp
  ));
}

export async function copyPreviousExerciseSets(
  sessionRepository: WorkoutSessionRepository,
  setRepository: StrengthSetRepository,
  currentSessionId: EntityId,
  currentSessionExerciseId: EntityId,
): Promise<StrengthSet[]> {
  const currentSession = await sessionRepository.getById(currentSessionId);
  if (!currentSession) throw new RepositoryError('Séance introuvable.', 'create');
  if (currentSession.status !== 'inProgress') {
    throw new RepositoryError('Les séries d’une séance terminée ne peuvent plus être modifiées.', 'create');
  }

  const currentExercise = (await sessionRepository.listExercises(currentSessionId))
    .find((exercise) => exercise.id === currentSessionExerciseId);
  if (!currentExercise) throw new RepositoryError('Exercice de séance introuvable.', 'create');

  const existingSets = await setRepository.listBySessionExercise(currentSessionExerciseId);
  if (existingSets.length > 0) {
    throw new RepositoryError(
      'Supprime les séries déjà saisies avant de reprendre les valeurs de la séance précédente.',
      'create',
    );
  }

  const previous = await getPreviousExercisePerformance(
    sessionRepository,
    setRepository,
    currentSessionId,
    currentExercise.exerciseDefinitionId,
  );
  if (!previous) {
    throw new RepositoryError('Aucune séance précédente terminée n’est disponible pour cet exercice.', 'create');
  }

  const inputs: Array<NewEntity<StrengthSet>> = previous.sets.map((set, index) => ({
    sessionId: currentSessionId,
    sessionExerciseId: currentSessionExerciseId,
    setNumber: index + 1,
    repetitions: set.repetitions,
    weightKg: set.weightKg,
    ...(set.rpe === undefined ? {} : { rpe: set.rpe }),
    type: set.type,
    isCompleted: false,
    ...(set.notes ? { notes: set.notes } : {}),
  }));

  return setRepository.createMany(inputs);
}
