import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { EntityId, NewEntity } from '@/domain/models/common';
import type {
  StrengthSet,
  StrengthTrackingMode,
  WorkoutSession,
  WorkoutSessionExercise,
} from '@/domain/models/strength';
import {
  calculateAdditionalVolumeKg,
  calculateSetVolumeKg,
  resolveTrackingMode,
} from '@/domain/strength/strengthTracking';
import type { ProfileRepository } from '@/infrastructure/repositories/contracts/ProfileRepository';
import type { StrengthSetRepository } from '@/infrastructure/repositories/contracts/StrengthSetRepository';
import type { WeightRepository } from '@/infrastructure/repositories/contracts/WeightRepository';
import type { WorkoutSessionRepository } from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';

export interface StrengthHistoryBodyWeightDependencies {
  weightRepository: Pick<WeightRepository, 'listAll'>;
  profileRepository: Pick<ProfileRepository, 'get'>;
}

export interface ExerciseHistoryEntry {
  session: WorkoutSession;
  sessionExercise: WorkoutSessionExercise;
  sets: StrengthSet[];
  workingSets: StrengthSet[];
  bodyWeightKg?: number;
  hasEffectiveLoadData: boolean;
  totalVolumeKg: number;
  totalAdditionalVolumeKg: number;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
}

function sessionTimestamp(session: WorkoutSession): string {
  return session.completedAt ?? session.startedAt ?? session.date;
}

function completedWorkingSets(sets: StrengthSet[]): StrengthSet[] {
  return sets.filter((set) => set.isCompleted && set.type !== 'warmup');
}

export function calculateExerciseVolume(
  sets: StrengthSet[],
  trackingMode: StrengthTrackingMode = 'loadRepetitions',
  bodyWeightKg?: number,
): number {
  return completedWorkingSets(sets).reduce((total, set) => (
    total + (calculateSetVolumeKg(set, trackingMode, bodyWeightKg) ?? 0)
  ), 0);
}

export function calculateExerciseAdditionalVolume(
  sets: StrengthSet[],
  trackingMode: StrengthTrackingMode,
): number {
  return completedWorkingSets(sets).reduce((total, set) => (
    total + (calculateAdditionalVolumeKg(set, trackingMode) ?? 0)
  ), 0);
}

export function calculateExerciseDuration(sets: StrengthSet[]): number {
  return completedWorkingSets(sets)
    .reduce((total, set) => total + (set.durationSeconds ?? 0), 0);
}

export function calculateExerciseDistance(sets: StrengthSet[]): number {
  return completedWorkingSets(sets)
    .reduce((total, set) => total + (set.distanceMeters ?? 0), 0);
}

function resolveApplicableBodyWeight(
  date: string,
  weights: Array<{ date: string; weightKg: number }>,
  initialWeightKg?: number,
): number | undefined {
  const applicable = weights
    .filter((entry) => entry.date <= date)
    .sort((left, right) => right.date.localeCompare(left.date))[0];
  return applicable?.weightKg ?? initialWeightKg;
}

async function loadBodyWeightContext(
  dependencies?: StrengthHistoryBodyWeightDependencies,
): Promise<{ weights: Array<{ date: string; weightKg: number }>; initialWeightKg?: number }> {
  if (!dependencies) return { weights: [] };
  const [weights, profile] = await Promise.all([
    dependencies.weightRepository.listAll(),
    dependencies.profileRepository.get(),
  ]);
  return {
    weights: weights.map(({ date, weightKg }) => ({ date, weightKg })),
    ...(profile ? { initialWeightKg: profile.initialWeightKg } : {}),
  };
}

export async function listExerciseHistory(
  sessionRepository: WorkoutSessionRepository,
  setRepository: StrengthSetRepository,
  exerciseDefinitionId: EntityId,
  bodyWeightDependencies?: StrengthHistoryBodyWeightDependencies,
): Promise<ExerciseHistoryEntry[]> {
  const [allSessions, bodyWeightContext] = await Promise.all([
    sessionRepository.listAll(),
    loadBodyWeightContext(bodyWeightDependencies),
  ]);
  const sessions = allSessions
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
    const trackingMode = resolveTrackingMode(sessionExercise);
    const bodyWeightKg = trackingMode === 'bodyweightRepetitions'
      || trackingMode === 'assistedRepetitions'
      ? resolveApplicableBodyWeight(
          session.date,
          bodyWeightContext.weights,
          bodyWeightContext.initialWeightKg,
        )
      : undefined;
    const requiresBodyWeight = trackingMode === 'bodyweightRepetitions'
      || trackingMode === 'assistedRepetitions';
    const hasEffectiveLoadData = trackingMode === 'loadRepetitions'
      || (requiresBodyWeight && bodyWeightKg !== undefined);

    entries.push({
      session,
      sessionExercise,
      sets,
      workingSets,
      ...(bodyWeightKg === undefined ? {} : { bodyWeightKg }),
      hasEffectiveLoadData,
      totalVolumeKg: calculateExerciseVolume(sets, trackingMode, bodyWeightKg),
      totalAdditionalVolumeKg: calculateExerciseAdditionalVolume(sets, trackingMode),
      totalDurationSeconds: calculateExerciseDuration(sets),
      totalDistanceMeters: calculateExerciseDistance(sets),
    });
  }

  return entries;
}

export async function getPreviousExercisePerformance(
  sessionRepository: WorkoutSessionRepository,
  setRepository: StrengthSetRepository,
  currentSessionId: EntityId,
  exerciseDefinitionId: EntityId,
  bodyWeightDependencies?: StrengthHistoryBodyWeightDependencies,
): Promise<ExerciseHistoryEntry | undefined> {
  const currentSession = await sessionRepository.getById(currentSessionId);
  if (!currentSession) throw new RepositoryError('Séance introuvable.', 'read');
  const currentTimestamp = sessionTimestamp(currentSession);
  const history = await listExerciseHistory(
    sessionRepository,
    setRepository,
    exerciseDefinitionId,
    bodyWeightDependencies,
  );
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
    ...(set.durationSeconds === undefined ? {} : { durationSeconds: set.durationSeconds }),
    ...(set.distanceMeters === undefined ? {} : { distanceMeters: set.distanceMeters }),
    ...(set.rpe === undefined ? {} : { rpe: set.rpe }),
    type: set.type,
    isCompleted: false,
    ...(set.notes ? { notes: set.notes } : {}),
  }));

  return setRepository.createMany(inputs);
}
