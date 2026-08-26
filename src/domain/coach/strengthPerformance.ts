import { calculateEstimatedOneRepMax } from '@/domain/calculations/strength';
import type {
  CoachSignalConfidence,
  CoachSignalEvidence,
  CoachSignalProvenance,
} from '@/domain/coach/coachSignalEvidence';
import type { EntityId, LocalDate } from '@/domain/models/common';
import type {
  ExerciseDefinition,
  StrengthSet,
  StrengthTrackingMode,
  WorkoutSession,
  WorkoutSessionExercise,
} from '@/domain/models/strength';
import {
  evaluateStrengthProgressionEligibility,
  type StrengthProgressionIneligibilityReason,
} from '@/domain/strength/strengthProgressionEligibility';
import { planningDateForSession } from '@/domain/strength/strengthPlanning';
import {
  calculateEffectiveLoadKg,
  calculateSetVolumeKg,
  primarySetValue,
  resolveTrackingMode,
} from '@/domain/strength/strengthTracking';

export type StrengthPerformanceTrend =
  | 'insufficientData'
  | 'progressing'
  | 'stable'
  | 'stagnating'
  | 'degrading';

export type StrengthPerformanceRelation =
  | 'improved'
  | 'equivalent'
  | 'regressed'
  | 'notComparable';

export interface StrengthPerformanceBestSet {
  setId: EntityId;
  setNumber: number;
  repetitions: number;
  weightKg: number;
  rpe?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  effectiveLoadKg?: number;
  estimatedOneRepMaxKg?: number;
}

export interface StrengthExerciseExposure {
  sessionId: EntityId;
  sessionExerciseId: EntityId;
  date: LocalDate;
  occurredAt: string;
  trackingMode: StrengthTrackingMode;
  plannedWorkingSetCount?: number;
  completedPlannedWorkingSetCount: number;
  completedTrainingSetCount: number;
  bestSet: StrengthPerformanceBestSet;
  estimatedOneRepMaxKg?: number;
  volumeKg?: number;
  volumeConfidence?: CoachSignalConfidence;
  bodyWeightProvenance?: CoachSignalProvenance;
  bodyWeightTrendConfirmed: boolean;
  progressionEligible: boolean;
  progressionIneligibilityReason?: StrengthProgressionIneligibilityReason;
  relationToPrevious: StrengthPerformanceRelation;
}

export interface StrengthExercisePerformance {
  exerciseDefinitionId: EntityId;
  exerciseName: string;
  trackingMode: StrengthTrackingMode;
  exposureCount: number;
  comparableExposureCount: number;
  trend: StrengthPerformanceTrend;
  reasons: string[];
  exposures: StrengthExerciseExposure[];
}

export interface StrengthSchedulePerformance {
  completedPlannedCount: number;
  skippedCount: number;
  overdueCount: number;
  abandonedCount: number;
}

export interface StrengthPerformanceSnapshot {
  referenceDate: LocalDate;
  exercises: StrengthExercisePerformance[];
  schedule: StrengthSchedulePerformance;
}

export interface StrengthPerformanceSnapshotInput {
  referenceDate: LocalDate;
  sessions: readonly WorkoutSession[];
  sessionExercises: readonly WorkoutSessionExercise[];
  sets: readonly StrengthSet[];
  exerciseDefinitions: readonly ExerciseDefinition[];
  bodyWeightEvidenceBySessionId?: Readonly<Record<EntityId, CoachSignalEvidence<number>>>;
}

function compareHigherIsBetter(previous: number, current: number): StrengthPerformanceRelation {
  if (current > previous) return 'improved';
  if (current < previous) return 'regressed';
  return 'equivalent';
}

function compareRpeTie(
  previousRpe: number | undefined,
  currentRpe: number | undefined,
): StrengthPerformanceRelation {
  if (previousRpe === undefined || currentRpe === undefined) return 'equivalent';
  if (currentRpe < previousRpe) return 'improved';
  if (currentRpe > previousRpe) return 'regressed';
  return 'equivalent';
}

export function compareStrengthPerformance(
  previous: StrengthExerciseExposure,
  current: StrengthExerciseExposure,
): StrengthPerformanceRelation {
  if (previous.trackingMode !== current.trackingMode) return 'notComparable';

  const previousSet = previous.bestSet;
  const currentSet = current.bestSet;
  switch (current.trackingMode) {
    case 'loadRepetitions': {
      if (currentSet.weightKg === previousSet.weightKg) {
        const repetitionRelation = compareHigherIsBetter(
          previousSet.repetitions,
          currentSet.repetitions,
        );
        return repetitionRelation === 'equivalent'
          ? compareRpeTie(previousSet.rpe, currentSet.rpe)
          : repetitionRelation;
      }
      if (
        previousSet.estimatedOneRepMaxKg === undefined
        || currentSet.estimatedOneRepMaxKg === undefined
      ) {
        return 'notComparable';
      }
      const estimateRelation = compareHigherIsBetter(
        previousSet.estimatedOneRepMaxKg,
        currentSet.estimatedOneRepMaxKg,
      );
      return estimateRelation === 'equivalent'
        ? compareRpeTie(previousSet.rpe, currentSet.rpe)
        : estimateRelation;
    }
    case 'repetitions':
    case 'duration':
    case 'distance': {
      const primaryRelation = compareHigherIsBetter(
        primarySetValue(previousSet, current.trackingMode),
        primarySetValue(currentSet, current.trackingMode),
      );
      return primaryRelation === 'equivalent'
        ? compareRpeTie(previousSet.rpe, currentSet.rpe)
        : primaryRelation;
    }
    case 'bodyweightRepetitions':
    case 'assistedRepetitions': {
      if (
        !previous.bodyWeightTrendConfirmed
        || !current.bodyWeightTrendConfirmed
        || previousSet.effectiveLoadKg === undefined
        || currentSet.effectiveLoadKg === undefined
      ) {
        return 'notComparable';
      }
      if (currentSet.effectiveLoadKg === previousSet.effectiveLoadKg) {
        const repetitionRelation = compareHigherIsBetter(
          previousSet.repetitions,
          currentSet.repetitions,
        );
        return repetitionRelation === 'equivalent'
          ? compareRpeTie(previousSet.rpe, currentSet.rpe)
          : repetitionRelation;
      }
      if (currentSet.repetitions === previousSet.repetitions) {
        return compareHigherIsBetter(
          previousSet.effectiveLoadKg,
          currentSet.effectiveLoadKg,
        );
      }
      if (
        currentSet.effectiveLoadKg > previousSet.effectiveLoadKg
        && currentSet.repetitions > previousSet.repetitions
      ) {
        return 'improved';
      }
      if (
        currentSet.effectiveLoadKg < previousSet.effectiveLoadKg
        && currentSet.repetitions < previousSet.repetitions
      ) {
        return 'regressed';
      }
      return 'notComparable';
    }
  }
}

function isUsefulCompletedSet(set: StrengthSet, mode: StrengthTrackingMode): boolean {
  if (!set.isCompleted || set.type === 'warmup') return false;
  return primarySetValue(set, mode) > 0;
}

function projectBestSet(
  set: StrengthSet,
  mode: StrengthTrackingMode,
  bodyWeightKg: number | undefined,
): StrengthPerformanceBestSet {
  const effectiveLoadKg = calculateEffectiveLoadKg(mode, set.weightKg, bodyWeightKg);
  const estimatedOneRepMaxKg = mode === 'loadRepetitions'
    ? calculateEstimatedOneRepMax(set.weightKg, set.repetitions)
    : undefined;
  return {
    setId: set.id,
    setNumber: set.setNumber,
    repetitions: set.repetitions,
    weightKg: set.weightKg,
    ...(set.rpe === undefined ? {} : { rpe: set.rpe }),
    ...(set.durationSeconds === undefined ? {} : { durationSeconds: set.durationSeconds }),
    ...(set.distanceMeters === undefined ? {} : { distanceMeters: set.distanceMeters }),
    ...(effectiveLoadKg === undefined ? {} : { effectiveLoadKg }),
    ...(estimatedOneRepMaxKg === undefined ? {} : { estimatedOneRepMaxKg }),
  };
}

function compareBestSetCandidates(
  left: StrengthPerformanceBestSet,
  right: StrengthPerformanceBestSet,
  mode: StrengthTrackingMode,
): number {
  const compareDescending = (leftValue: number, rightValue: number): number => (
    rightValue - leftValue
  );
  let comparison = 0;
  switch (mode) {
    case 'loadRepetitions':
      comparison = compareDescending(
        left.estimatedOneRepMaxKg === undefined ? -1 : left.estimatedOneRepMaxKg,
        right.estimatedOneRepMaxKg === undefined ? -1 : right.estimatedOneRepMaxKg,
      );
      if (comparison === 0) comparison = compareDescending(left.weightKg, right.weightKg);
      if (comparison === 0) {
        comparison = compareDescending(left.repetitions, right.repetitions);
      }
      break;
    case 'bodyweightRepetitions':
    case 'assistedRepetitions':
      comparison = compareDescending(
        left.effectiveLoadKg === undefined ? -1 : left.effectiveLoadKg,
        right.effectiveLoadKg === undefined ? -1 : right.effectiveLoadKg,
      );
      if (comparison === 0) {
        comparison = compareDescending(left.repetitions, right.repetitions);
      }
      break;
    case 'repetitions':
    case 'duration':
    case 'distance':
      comparison = compareDescending(
        primarySetValue(left, mode),
        primarySetValue(right, mode),
      );
      break;
  }
  if (comparison === 0 && left.rpe !== undefined && right.rpe !== undefined) {
    comparison = left.rpe - right.rpe;
  }
  if (comparison === 0) comparison = left.setNumber - right.setNumber;
  return comparison === 0 ? left.setId.localeCompare(right.setId) : comparison;
}

function exposureOrder(left: StrengthExerciseExposure, right: StrengthExerciseExposure): number {
  const dateOrder = left.date.localeCompare(right.date);
  if (dateOrder !== 0) return dateOrder;
  const timestampOrder = left.occurredAt.localeCompare(right.occurredAt);
  if (timestampOrder !== 0) return timestampOrder;
  const sessionOrder = left.sessionId.localeCompare(right.sessionId);
  return sessionOrder !== 0
    ? sessionOrder
    : left.sessionExerciseId.localeCompare(right.sessionExerciseId);
}

function buildExposure(
  session: WorkoutSession,
  exercise: WorkoutSessionExercise,
  allSets: readonly StrengthSet[],
  bodyWeightEvidence: CoachSignalEvidence<number> | undefined,
): StrengthExerciseExposure | undefined {
  const mode = resolveTrackingMode(exercise);
  const exerciseSets = allSets.filter((set) => set.sessionExerciseId === exercise.id);
  const completedTrainingSets = exerciseSets.filter((set) => isUsefulCompletedSet(set, mode));
  if (completedTrainingSets.length === 0) return undefined;

  const bodyWeightKg = bodyWeightEvidence?.value;
  const bestSet = completedTrainingSets
    .map((set) => projectBestSet(set, mode, bodyWeightKg))
    .sort((left, right) => compareBestSetCandidates(left, right, mode))[0]!;
  const plannedWorkingSets = exerciseSets
    .filter((set) => set.type === 'working')
    .sort((left, right) => left.setNumber - right.setNumber)
    .slice(0, exercise.plannedSets ?? 0);
  const completedPlannedWorkingSetCount = plannedWorkingSets.filter((set) => (
    set.isCompleted
  )).length;
  const volumes = completedTrainingSets.map((set) => (
    calculateSetVolumeKg(set, mode, bodyWeightKg)
  ));
  const volumeKg = volumes.every((value) => value !== undefined)
    ? volumes.reduce<number>((total, value) => total + value!, 0)
    : undefined;
  const progression = evaluateStrengthProgressionEligibility(exercise, exerciseSets);
  const bodyWeightTrendConfirmed = bodyWeightEvidence?.provenance === 'userMeasured'
    && bodyWeightEvidence.confidence === 'confirmed';

  return {
    sessionId: session.id,
    sessionExerciseId: exercise.id,
    date: session.date,
    occurredAt: session.completedAt ?? session.startedAt ?? session.updatedAt ?? session.createdAt,
    trackingMode: mode,
    ...(exercise.plannedSets === undefined ? {} : {
      plannedWorkingSetCount: exercise.plannedSets,
    }),
    completedPlannedWorkingSetCount,
    completedTrainingSetCount: completedTrainingSets.length,
    bestSet,
    ...(bestSet.estimatedOneRepMaxKg === undefined ? {} : {
      estimatedOneRepMaxKg: bestSet.estimatedOneRepMaxKg,
    }),
    ...(volumeKg === undefined ? {} : { volumeKg }),
    ...(volumeKg === undefined ? {} : {
      volumeConfidence: mode === 'bodyweightRepetitions' || mode === 'assistedRepetitions'
        ? bodyWeightEvidence?.confidence ?? 'unknown'
        : 'confirmed',
    }),
    ...(bodyWeightEvidence === undefined ? {} : {
      bodyWeightProvenance: bodyWeightEvidence.provenance,
    }),
    bodyWeightTrendConfirmed,
    progressionEligible: progression.eligible,
    ...(progression.eligible ? {} : {
      progressionIneligibilityReason: progression.reason,
    }),
    relationToPrevious: 'notComparable',
  };
}

function resolveTrend(exposures: readonly StrengthExerciseExposure[]): {
  trend: StrengthPerformanceTrend;
  reasons: string[];
  comparableExposureCount: number;
} {
  if (exposures.length < 2) {
    return {
      trend: 'insufficientData',
      reasons: ['fewerThanTwoComparableExposures'],
      comparableExposureCount: exposures.length,
    };
  }

  let comparableExposureCount = 1;
  for (let index = exposures.length - 1; index > 0; index -= 1) {
    if (exposures[index]?.relationToPrevious === 'notComparable') break;
    comparableExposureCount += 1;
  }
  const latestRelation = exposures.at(-1)!.relationToPrevious;
  if (latestRelation === 'notComparable') {
    return {
      trend: 'insufficientData',
      reasons: ['latestExposureNotComparable'],
      comparableExposureCount,
    };
  }
  if (latestRelation === 'improved') {
    return {
      trend: 'progressing',
      reasons: ['latestComparableExposureImproved'],
      comparableExposureCount,
    };
  }

  const previousRelation = exposures.at(-2)?.relationToPrevious;
  if (
    comparableExposureCount >= 3
    && latestRelation === 'regressed'
    && previousRelation === 'regressed'
  ) {
    return {
      trend: 'degrading',
      reasons: ['twoConsecutiveComparableRegressions'],
      comparableExposureCount,
    };
  }
  if (comparableExposureCount >= 3) {
    const lastTwoRelations = exposures.slice(-2).map(({ relationToPrevious }) => (
      relationToPrevious
    ));
    if (lastTwoRelations.every((relation) => relation !== 'improved')) {
      return {
        trend: 'stagnating',
        reasons: ['threeComparableExposuresWithoutProgress'],
        comparableExposureCount,
      };
    }
  }
  return {
    trend: 'stable',
    reasons: ['comparableDataWithoutConfirmedTrend'],
    comparableExposureCount,
  };
}

function isPlannedSession(session: WorkoutSession): boolean {
  return session.plannedDate !== undefined
    || session.originalPlannedDate !== undefined
    || session.plannedAt !== undefined;
}

export function buildStrengthSchedulePerformance(
  sessions: readonly WorkoutSession[],
  referenceDate: LocalDate,
): StrengthSchedulePerformance {
  return {
    completedPlannedCount: sessions.filter((session) => (
      session.status === 'completed' && isPlannedSession(session)
    )).length,
    skippedCount: sessions.filter(({ status }) => status === 'skipped').length,
    overdueCount: sessions.filter((session) => (
      session.status === 'planned'
      && planningDateForSession(session).localeCompare(referenceDate) < 0
    )).length,
    abandonedCount: sessions.filter(({ status }) => status === 'abandoned').length,
  };
}

export function buildStrengthPerformanceSnapshot(
  input: StrengthPerformanceSnapshotInput,
): StrengthPerformanceSnapshot {
  const sessionsById = new Map(input.sessions.map((session) => [session.id, session]));
  const definitionsById = new Map(input.exerciseDefinitions.map((definition) => (
    [definition.id, definition]
  )));
  const exposuresByExercise = new Map<EntityId, StrengthExerciseExposure[]>();

  input.sessionExercises.forEach((exercise) => {
    const session = sessionsById.get(exercise.sessionId);
    if (!session || session.status !== 'completed') return;
    const exposure = buildExposure(
      session,
      exercise,
      input.sets,
      input.bodyWeightEvidenceBySessionId?.[session.id],
    );
    if (!exposure) return;
    const exposures = exposuresByExercise.get(exercise.exerciseDefinitionId) ?? [];
    exposures.push(exposure);
    exposuresByExercise.set(exercise.exerciseDefinitionId, exposures);
  });

  const exercises = [...exposuresByExercise.entries()].map(([
    exerciseDefinitionId,
    unorderedExposures,
  ]) => {
    const orderedExposures = [...unorderedExposures].sort(exposureOrder);
    const exposures = orderedExposures.map((exposure, index) => ({
      ...exposure,
      relationToPrevious: index === 0
        ? 'notComparable' as const
        : compareStrengthPerformance(orderedExposures[index - 1]!, exposure),
    }));
    const trend = resolveTrend(exposures);
    const latestExposure = exposures.at(-1)!;
    const latestExerciseSnapshot = input.sessionExercises.find((exercise) => (
      exercise.id === latestExposure.sessionExerciseId
    ));
    return {
      exerciseDefinitionId,
      exerciseName: definitionsById.get(exerciseDefinitionId)?.name
        ?? latestExerciseSnapshot?.exerciseNameSnapshot
        ?? exerciseDefinitionId,
      trackingMode: latestExposure.trackingMode,
      exposureCount: exposures.length,
      comparableExposureCount: trend.comparableExposureCount,
      trend: trend.trend,
      reasons: trend.reasons,
      exposures,
    } satisfies StrengthExercisePerformance;
  }).sort((left, right) => (
    left.exerciseName.localeCompare(right.exerciseName, 'fr')
    || left.exerciseDefinitionId.localeCompare(right.exerciseDefinitionId)
  ));

  return {
    referenceDate: input.referenceDate,
    exercises,
    schedule: buildStrengthSchedulePerformance(input.sessions, input.referenceDate),
  };
}
