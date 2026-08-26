import {
  buildStrengthPerformanceSnapshot,
  type StrengthPerformanceSnapshot,
  type StrengthPerformanceSnapshotInput,
} from '@/domain/coach/strengthPerformance';
import { resolveWeightEntryEvidence } from '@/domain/coach/coachSignalEvidence';
import type { EntityId, LocalDate } from '@/domain/models/common';
import type {
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
} from '@/domain/models/strength';
import type { WeightEntry } from '@/domain/models/weight';
import { resolveTrackingMode } from '@/domain/strength/strengthTracking';
import type { StrengthExerciseRepository } from '@/infrastructure/repositories/contracts/StrengthExerciseRepository';
import type { StrengthSetRepository } from '@/infrastructure/repositories/contracts/StrengthSetRepository';
import type { WeightRepository } from '@/infrastructure/repositories/contracts/WeightRepository';
import type { WorkoutSessionRepository } from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';
import { repositories } from '@/infrastructure/repositories/repositories';
import { isValidLocalDate } from '@/shared/validation/localDate';

export interface StrengthPerformanceServiceDependencies {
  workoutSessions: Pick<WorkoutSessionRepository, 'listAll' | 'listExercises'>;
  strengthSets: Pick<StrengthSetRepository, 'listBySession'>;
  strengthExercises: Pick<StrengthExerciseRepository, 'listAll'>;
  weight: Pick<WeightRepository, 'listAll'>;
  buildSnapshot?: (input: StrengthPerformanceSnapshotInput) => StrengthPerformanceSnapshot;
}

const defaultDependencies: StrengthPerformanceServiceDependencies = {
  workoutSessions: repositories.workoutSessions,
  strengthSets: repositories.strengthSets,
  strengthExercises: repositories.strengthExercises,
  weight: repositories.weight,
};

function compareWeightEntries(left: WeightEntry, right: WeightEntry): number {
  const dateOrder = left.date.localeCompare(right.date);
  if (dateOrder !== 0) return dateOrder;
  const updatedOrder = left.updatedAt.localeCompare(right.updatedAt);
  return updatedOrder !== 0 ? updatedOrder : left.id.localeCompare(right.id);
}

function latestWeightOnOrBefore(
  weights: readonly WeightEntry[],
  date: LocalDate,
): WeightEntry | undefined {
  return weights
    .filter((entry) => entry.date.localeCompare(date) <= 0)
    .sort(compareWeightEntries)
    .at(-1);
}

function usesBodyWeight(exercises: readonly WorkoutSessionExercise[]): boolean {
  return exercises.some((exercise) => {
    const mode = resolveTrackingMode(exercise);
    return mode === 'bodyweightRepetitions' || mode === 'assistedRepetitions';
  });
}

interface CompletedSessionData {
  session: WorkoutSession;
  exercises: WorkoutSessionExercise[];
  sets: StrengthSet[];
}

export async function calculateStrengthPerformance(
  referenceDate: LocalDate,
  dependencies: StrengthPerformanceServiceDependencies = defaultDependencies,
): Promise<StrengthPerformanceSnapshot> {
  if (!isValidLocalDate(referenceDate)) {
    throw new Error('La date de référence de la performance Strength est invalide.');
  }

  const [sessions, exerciseDefinitions] = await Promise.all([
    dependencies.workoutSessions.listAll(),
    dependencies.strengthExercises.listAll(),
  ]);
  const completedSessions = sessions.filter(({ status }) => status === 'completed');
  const completedData = await Promise.all(completedSessions.map(async (session) => {
    const [exercises, sets] = await Promise.all([
      dependencies.workoutSessions.listExercises(session.id),
      dependencies.strengthSets.listBySession(session.id),
    ]);
    return { session, exercises, sets } satisfies CompletedSessionData;
  }));
  const sessionExercises = completedData.flatMap(({ exercises }) => exercises);
  const sets = completedData.flatMap((data) => data.sets);

  const bodyWeightEvidenceBySessionId: Record<
    EntityId,
    ReturnType<typeof resolveWeightEntryEvidence>
  > = {};
  if (usesBodyWeight(sessionExercises)) {
    const weights = await dependencies.weight.listAll();
    completedData.forEach(({ session, exercises }) => {
      if (!usesBodyWeight(exercises)) return;
      const weight = latestWeightOnOrBefore(weights, session.date);
      if (weight) bodyWeightEvidenceBySessionId[session.id] = resolveWeightEntryEvidence(weight);
    });
  }

  return (dependencies.buildSnapshot ?? buildStrengthPerformanceSnapshot)({
    referenceDate,
    sessions,
    sessionExercises,
    sets,
    exerciseDefinitions,
    ...(Object.keys(bodyWeightEvidenceBySessionId).length === 0 ? {} : {
      bodyWeightEvidenceBySessionId,
    }),
  });
}
