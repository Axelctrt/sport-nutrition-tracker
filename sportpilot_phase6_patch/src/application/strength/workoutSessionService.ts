import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { EntityId } from '@/domain/models/common';
import type {
  ExerciseDefinition,
  WorkoutSession,
  WorkoutSessionExercise,
} from '@/domain/models/strength';
import type { StrengthExerciseRepository } from '@/infrastructure/repositories/contracts/StrengthExerciseRepository';
import type { WorkoutSessionRepository } from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';
import { defaultTrackingModeForLoadUnit } from '@/domain/strength/strengthTracking';
import type { WorkoutTemplateRepository } from '@/infrastructure/repositories/contracts/WorkoutTemplateRepository';
import { toLocalDate } from '@/shared/utils/dates';

export interface WorkoutSessionSummary {
  session: WorkoutSession;
  exerciseCount: number;
}

export interface WorkoutSessionView {
  session: WorkoutSession;
  exercises: WorkoutSessionExercise[];
}

function sessionTitle(session: WorkoutSession): string {
  return session.sourceTemplateNameSnapshot ?? 'Séance libre';
}

export function getWorkoutSessionTitle(session: WorkoutSession): string {
  return sessionTitle(session);
}

async function ensureNoSessionInProgress(repository: WorkoutSessionRepository): Promise<void> {
  const current = await repository.getInProgress();
  if (current) {
    throw new RepositoryError(
      `Une séance est déjà en cours : ${sessionTitle(current)}. Termine-la ou abandonne-la avant d’en démarrer une autre.`,
      'create',
    );
  }
}

function sessionBase(now: Date): Pick<WorkoutSession, 'date' | 'status' | 'startedAt'> {
  return {
    date: toLocalDate(now),
    status: 'inProgress',
    startedAt: now.toISOString(),
  };
}

export async function startEmptyWorkoutSession(
  repository: WorkoutSessionRepository,
  now = new Date(),
): Promise<WorkoutSessionView> {
  await ensureNoSessionInProgress(repository);
  return repository.createWithExercises(sessionBase(now), []);
}

export async function startWorkoutSessionFromTemplate(
  sessionRepository: WorkoutSessionRepository,
  templateRepository: WorkoutTemplateRepository,
  exerciseRepository: StrengthExerciseRepository,
  templateId: EntityId,
  now = new Date(),
): Promise<WorkoutSessionView> {
  await ensureNoSessionInProgress(sessionRepository);
  const template = await templateRepository.getById(templateId);
  if (!template) throw new RepositoryError('Séance modèle introuvable.', 'create');
  if (template.isArchived) throw new RepositoryError('Une séance archivée ne peut pas être démarrée.', 'create');

  const configurations = (await templateRepository.listExercises(templateId))
    .filter((exercise) => exercise.isActive)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  if (configurations.length === 0) {
    throw new RepositoryError('Cette séance modèle ne contient aucun exercice actif.', 'create');
  }

  const definitions = new Map((await exerciseRepository.listAll()).map((exercise) => [exercise.id, exercise]));
  const exercises = configurations.map((configuration, sortOrder) => {
    const definition = definitions.get(configuration.exerciseDefinitionId);
    if (!definition) throw new RepositoryError('Un exercice de cette séance modèle est introuvable.', 'create');
    return {
      exerciseDefinitionId: definition.id,
      exerciseNameSnapshot: definition.name,
      sortOrder,
      sourceTemplateExerciseId: configuration.id,
      plannedSets: configuration.plannedSets,
      minRepetitions: configuration.minRepetitions,
      maxRepetitions: configuration.maxRepetitions,
      ...(configuration.targetLoadKg === undefined ? {} : { targetLoadKg: configuration.targetLoadKg }),
      ...(configuration.targetDurationSeconds === undefined
        ? {}
        : { targetDurationSeconds: configuration.targetDurationSeconds }),
      ...(configuration.targetDistanceMeters === undefined
        ? {}
        : { targetDistanceMeters: configuration.targetDistanceMeters }),
      loadIncrementKg: configuration.loadIncrementKg,
      ...(configuration.restSeconds === undefined ? {} : { restSeconds: configuration.restSeconds }),
      ...(configuration.maximumRecommendedRpe === undefined
        ? {}
        : { maximumRecommendedRpe: configuration.maximumRecommendedRpe }),
      loadUnitSnapshot: definition.loadUnit,
      trackingModeSnapshot: definition.trackingMode ?? defaultTrackingModeForLoadUnit(definition.loadUnit),
      ...(configuration.notes ? { notes: configuration.notes } : {}),
    } satisfies Omit<WorkoutSessionExercise, 'id' | 'sessionId' | 'createdAt' | 'updatedAt'>;
  });

  return sessionRepository.createWithExercises({
    ...sessionBase(now),
    sourceTemplateId: template.id,
    sourceTemplateNameSnapshot: template.name,
    ...(template.notes ? { notes: template.notes } : {}),
  }, exercises);
}

export async function listWorkoutSessions(
  repository: WorkoutSessionRepository,
): Promise<WorkoutSessionSummary[]> {
  const sessions = await repository.listAll();
  const summaries = await Promise.all(sessions.map(async (session) => ({
    session,
    exerciseCount: (await repository.listExercises(session.id)).length,
  })));

  return summaries.sort((left, right) => {
    if (left.session.status !== right.session.status) {
      if (left.session.status === 'inProgress') return -1;
      if (right.session.status === 'inProgress') return 1;
    }
    return (right.session.startedAt ?? right.session.date).localeCompare(
      left.session.startedAt ?? left.session.date,
    );
  });
}

export async function getWorkoutSessionView(
  repository: WorkoutSessionRepository,
  sessionId: EntityId,
): Promise<WorkoutSessionView> {
  const session = await repository.getById(sessionId);
  if (!session) throw new RepositoryError('Séance introuvable.', 'read');
  return { session, exercises: await repository.listExercises(sessionId) };
}

function ensureSessionCanBeEdited(session: WorkoutSession): void {
  if (session.status !== 'inProgress') {
    throw new RepositoryError('Cette séance est déjà terminée et ne peut plus être modifiée.', 'update');
  }
}

export async function addExerciseToWorkoutSession(
  sessionRepository: WorkoutSessionRepository,
  exerciseRepository: StrengthExerciseRepository,
  sessionId: EntityId,
  exerciseDefinitionId: EntityId,
): Promise<WorkoutSessionExercise> {
  const session = await sessionRepository.getById(sessionId);
  if (!session) throw new RepositoryError('Séance introuvable.', 'create');
  ensureSessionCanBeEdited(session);

  const definition = await exerciseRepository.getById(exerciseDefinitionId);
  if (!definition || definition.isArchived) {
    throw new RepositoryError('Cet exercice est indisponible.', 'create');
  }
  const current = await sessionRepository.listExercises(sessionId);
  if (current.some((exercise) => exercise.exerciseDefinitionId === exerciseDefinitionId)) {
    throw new RepositoryError('Cet exercice est déjà présent dans la séance.', 'create');
  }

  return sessionRepository.addExercise(sessionId, {
    exerciseDefinitionId: definition.id,
    exerciseNameSnapshot: definition.name,
    sortOrder: current.length,
    loadUnitSnapshot: definition.loadUnit,
    trackingModeSnapshot: definition.trackingMode ?? defaultTrackingModeForLoadUnit(definition.loadUnit),
  });
}

export async function removeExerciseFromWorkoutSession(
  repository: WorkoutSessionRepository,
  sessionId: EntityId,
  sessionExerciseId: EntityId,
): Promise<WorkoutSessionExercise[]> {
  const session = await repository.getById(sessionId);
  if (!session) throw new RepositoryError('Séance introuvable.', 'delete');
  ensureSessionCanBeEdited(session);
  await repository.removeExercise(sessionId, sessionExerciseId);
  const remaining = await repository.listExercises(sessionId);
  return repository.replaceExercises(sessionId, remaining);
}

export async function moveWorkoutSessionExercise(
  repository: WorkoutSessionRepository,
  sessionId: EntityId,
  sessionExerciseId: EntityId,
  direction: -1 | 1,
): Promise<WorkoutSessionExercise[]> {
  const session = await repository.getById(sessionId);
  if (!session) throw new RepositoryError('Séance introuvable.', 'update');
  ensureSessionCanBeEdited(session);
  const exercises = await repository.listExercises(sessionId);
  const currentIndex = exercises.findIndex((exercise) => exercise.id === sessionExerciseId);
  if (currentIndex < 0) throw new RepositoryError('Exercice de séance introuvable.', 'update');
  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= exercises.length) return exercises;
  [exercises[currentIndex], exercises[targetIndex]] = [exercises[targetIndex]!, exercises[currentIndex]!];
  return repository.replaceExercises(sessionId, exercises);
}

export async function updateWorkoutSessionNotes(
  repository: WorkoutSessionRepository,
  sessionId: EntityId,
  notes: string,
): Promise<WorkoutSession> {
  const session = await repository.getById(sessionId);
  if (!session) throw new RepositoryError('Séance introuvable.', 'update');
  ensureSessionCanBeEdited(session);
  return repository.update(sessionId, { notes: notes.trim() });
}

function durationMinutes(startedAt: string | undefined, now: Date): number | undefined {
  if (!startedAt) return undefined;
  const elapsed = Math.round((now.getTime() - new Date(startedAt).getTime()) / 60_000);
  return Math.max(0, elapsed);
}

export async function completeWorkoutSession(
  repository: WorkoutSessionRepository,
  sessionId: EntityId,
  now = new Date(),
): Promise<WorkoutSession> {
  const session = await repository.getById(sessionId);
  if (!session) throw new RepositoryError('Séance introuvable.', 'update');
  ensureSessionCanBeEdited(session);
  const exercises = await repository.listExercises(sessionId);
  if (exercises.length === 0) {
    throw new RepositoryError('Ajoute au moins un exercice avant de terminer la séance.', 'update');
  }
  const duration = durationMinutes(session.startedAt, now);
  return repository.update(sessionId, {
    status: 'completed',
    completedAt: now.toISOString(),
    ...(duration === undefined ? {} : { durationMinutes: duration }),
  });
}

export async function abandonWorkoutSession(
  repository: WorkoutSessionRepository,
  sessionId: EntityId,
  now = new Date(),
): Promise<WorkoutSession> {
  const session = await repository.getById(sessionId);
  if (!session) throw new RepositoryError('Séance introuvable.', 'update');
  ensureSessionCanBeEdited(session);
  const duration = durationMinutes(session.startedAt, now);
  return repository.update(sessionId, {
    status: 'abandoned',
    completedAt: now.toISOString(),
    ...(duration === undefined ? {} : { durationMinutes: duration }),
  });
}

export function availableExercisesForSession(
  definitions: ExerciseDefinition[],
  sessionExercises: WorkoutSessionExercise[],
): ExerciseDefinition[] {
  const usedIds = new Set(sessionExercises.map((exercise) => exercise.exerciseDefinitionId));
  return definitions
    .filter((exercise) => !exercise.isArchived && !usedIds.has(exercise.id))
    .sort((left, right) => left.name.localeCompare(right.name, 'fr'));
}
