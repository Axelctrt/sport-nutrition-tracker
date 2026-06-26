import type { ExerciseHistoryEntry } from '@/application/strength/strengthHistoryService';
import type { StrengthSet, StrengthTrackingMode } from '@/domain/models/strength';
import {
  calculateEffectiveLoadKg,
  resolveTrackingMode,
} from '@/domain/strength/strengthTracking';

export interface StrengthSessionAnalyticsPoint {
  sessionId: string;
  date: string;
  sessionName: string;
  trackingMode: StrengthTrackingMode;
  workingSetCount: number;
  totalRepetitions: number;
  bestRepetitions: number;
  totalVolumeKg: number;
  totalAdditionalVolumeKg: number;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  bestDurationSeconds: number;
  bestDistanceMeters: number;
  bestLoadKg: number;
  averageLoadKg: number;
  bestInputLoadKg: number;
  averageInputLoadKg: number;
  minimumAssistanceKg: number;
  maximumAdditionalLoadKg: number;
  bestSetVolumeKg: number;
  bodyWeightKg?: number;
  hasEffectiveLoadData: boolean;
  estimatedOneRepMaxKg?: number;
}

export interface StrengthLoadRepetitionRecord {
  weightKg: number;
  repetitions: number;
  sessionId: string;
  date: string;
  effectiveLoadKg?: number;
  bodyWeightKg?: number;
}

export interface StrengthExerciseComparison {
  latest: StrengthSessionAnalyticsPoint;
  previous: StrengthSessionAnalyticsPoint;
  volumeDeltaKg: number;
  volumeDeltaPercent?: number;
  bestLoadDeltaKg: number;
  repetitionsDelta: number;
  averageLoadDeltaKg: number;
  additionalLoadDeltaKg: number;
  assistanceDeltaKg: number;
  durationDeltaSeconds: number;
  distanceDeltaMeters: number;
}

export interface StrengthExerciseAnalyticsSummary {
  sessionCount: number;
  workingSetCount: number;
  totalRepetitions: number;
  totalVolumeKg: number;
  totalAdditionalVolumeKg: number;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  bestLoadKg: number;
  averageLoadKg: number;
  bestInputLoadKg: number;
  averageInputLoadKg: number;
  minimumAssistanceKg: number;
  maximumAdditionalLoadKg: number;
  bestRepetitions: number;
  bestDurationSeconds: number;
  bestDistanceMeters: number;
  bestSetVolumeKg: number;
  bestSessionVolumeKg: number;
  hasEffectiveLoadData: boolean;
  estimatedOneRepMaxKg?: number;
}

export interface StrengthExerciseAnalytics {
  trackingMode: StrengthTrackingMode;
  summary: StrengthExerciseAnalyticsSummary;
  sessions: StrengthSessionAnalyticsPoint[];
  loadRepetitionRecords: StrengthLoadRepetitionRecord[];
  comparison?: StrengthExerciseComparison;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function sessionTimestamp(entry: ExerciseHistoryEntry): string {
  return entry.session.completedAt ?? entry.session.startedAt ?? entry.session.date;
}

export function calculateEstimatedOneRepMax(
  weightKg: number,
  repetitions: number,
): number | undefined {
  if (weightKg <= 0 || repetitions <= 0 || repetitions > 12) return undefined;
  if (repetitions === 1) return weightKg;
  return roundToOneDecimal(weightKg * (1 + repetitions / 30));
}

function effectiveLoads(
  sets: StrengthSet[],
  trackingMode: StrengthTrackingMode,
  bodyWeightKg?: number,
): number[] {
  return sets.flatMap((set) => {
    const value = calculateEffectiveLoadKg(trackingMode, set.weightKg, bodyWeightKg);
    return value === undefined ? [] : [value];
  });
}

function createSessionPoint(entry: ExerciseHistoryEntry): StrengthSessionAnalyticsPoint | undefined {
  if (entry.workingSets.length === 0) return undefined;

  const trackingMode = resolveTrackingMode(entry.sessionExercise);
  const workingSetCount = entry.workingSets.length;
  const totalRepetitions = entry.workingSets.reduce((total, set) => total + set.repetitions, 0);
  const bestRepetitions = entry.workingSets.reduce((best, set) => Math.max(best, set.repetitions), 0);
  const inputLoads = entry.workingSets.map((set) => set.weightKg);
  const calculatedEffectiveLoads = effectiveLoads(entry.workingSets, trackingMode, entry.bodyWeightKg);
  const hasEffectiveLoadData = entry.hasEffectiveLoadData
    && calculatedEffectiveLoads.length === workingSetCount;
  const bestLoadKg = hasEffectiveLoadData ? Math.max(...calculatedEffectiveLoads) : 0;
  const averageLoadKg = hasEffectiveLoadData
    ? roundToOneDecimal(calculatedEffectiveLoads.reduce((total, value) => total + value, 0) / workingSetCount)
    : 0;
  const bestSetVolumeKg = hasEffectiveLoadData
    ? entry.workingSets.reduce((best, set) => {
        const load = calculateEffectiveLoadKg(trackingMode, set.weightKg, entry.bodyWeightKg) ?? 0;
        return Math.max(best, load * set.repetitions);
      }, 0)
    : 0;
  const estimatedOneRepMaxKg = trackingMode === 'loadRepetitions'
    ? entry.workingSets.reduce<number | undefined>((best, set) => {
        const estimate = calculateEstimatedOneRepMax(set.weightKg, set.repetitions);
        if (estimate === undefined) return best;
        return best === undefined ? estimate : Math.max(best, estimate);
      }, undefined)
    : undefined;

  return {
    sessionId: entry.session.id,
    date: entry.session.date,
    sessionName: entry.session.sourceTemplateNameSnapshot ?? 'Séance libre',
    trackingMode,
    workingSetCount,
    totalRepetitions,
    bestRepetitions,
    totalVolumeKg: roundToOneDecimal(entry.totalVolumeKg),
    totalAdditionalVolumeKg: roundToOneDecimal(entry.totalAdditionalVolumeKg),
    totalDurationSeconds: roundToOneDecimal(entry.totalDurationSeconds),
    totalDistanceMeters: roundToOneDecimal(entry.totalDistanceMeters),
    bestDurationSeconds: entry.workingSets.reduce(
      (best, set) => Math.max(best, set.durationSeconds ?? 0),
      0,
    ),
    bestDistanceMeters: entry.workingSets.reduce(
      (best, set) => Math.max(best, set.distanceMeters ?? 0),
      0,
    ),
    bestLoadKg: roundToOneDecimal(bestLoadKg),
    averageLoadKg,
    bestInputLoadKg: trackingMode === 'assistedRepetitions'
      ? Math.min(...inputLoads)
      : Math.max(...inputLoads),
    averageInputLoadKg: roundToOneDecimal(
      inputLoads.reduce((total, value) => total + value, 0) / workingSetCount,
    ),
    minimumAssistanceKg: trackingMode === 'assistedRepetitions' ? Math.min(...inputLoads) : 0,
    maximumAdditionalLoadKg: trackingMode === 'bodyweightRepetitions' ? Math.max(...inputLoads) : 0,
    bestSetVolumeKg: roundToOneDecimal(bestSetVolumeKg),
    ...(entry.bodyWeightKg === undefined ? {} : { bodyWeightKg: entry.bodyWeightKg }),
    hasEffectiveLoadData,
    ...(estimatedOneRepMaxKg === undefined ? {} : { estimatedOneRepMaxKg }),
  };
}

function createLoadRepetitionRecords(
  history: ExerciseHistoryEntry[],
  trackingMode: StrengthTrackingMode,
): StrengthLoadRepetitionRecord[] {
  if (
    trackingMode === 'repetitions'
    || trackingMode === 'duration'
    || trackingMode === 'distance'
  ) {
    return [];
  }

  const records = new Map<number, StrengthLoadRepetitionRecord>();

  for (const entry of history) {
    for (const set of entry.workingSets) {
      const effectiveLoadKg = calculateEffectiveLoadKg(
        trackingMode,
        set.weightKg,
        entry.bodyWeightKg,
      );
      const candidate: StrengthLoadRepetitionRecord = {
        weightKg: set.weightKg,
        repetitions: set.repetitions,
        sessionId: entry.session.id,
        date: entry.session.date,
        ...(trackingMode === 'loadRepetitions' || effectiveLoadKg === undefined
          ? {}
          : { effectiveLoadKg }),
        ...(trackingMode === 'loadRepetitions' || entry.bodyWeightKg === undefined
          ? {}
          : { bodyWeightKg: entry.bodyWeightKg }),
      };
      const current = records.get(set.weightKg);
      if (
        !current
        || candidate.repetitions > current.repetitions
        || (
          candidate.repetitions === current.repetitions
          && (candidate.effectiveLoadKg ?? 0) > (current.effectiveLoadKg ?? 0)
        )
      ) {
        records.set(set.weightKg, candidate);
      }
    }
  }

  return [...records.values()].sort((left, right) => {
    if (trackingMode === 'assistedRepetitions') {
      return left.weightKg - right.weightKg || right.repetitions - left.repetitions;
    }
    return right.weightKg - left.weightKg || right.repetitions - left.repetitions;
  });
}

export function buildStrengthExerciseAnalytics(
  history: ExerciseHistoryEntry[],
  fallbackTrackingMode: StrengthTrackingMode = 'loadRepetitions',
): StrengthExerciseAnalytics {
  const trackingMode = history[0]
    ? resolveTrackingMode(history[0].sessionExercise)
    : fallbackTrackingMode;
  const sessionsDescending = history
    .map((entry) => ({ entry, point: createSessionPoint(entry) }))
    .filter((item): item is { entry: ExerciseHistoryEntry; point: StrengthSessionAnalyticsPoint } => (
      item.point !== undefined
    ))
    .sort((left, right) => sessionTimestamp(right.entry).localeCompare(sessionTimestamp(left.entry)))
    .map((item) => item.point);

  const sessions = [...sessionsDescending].reverse();
  const workingSets = history.flatMap((entry) => entry.workingSets);
  const workingSetCount = workingSets.length;
  const totalRepetitions = sessions.reduce((total, session) => total + session.totalRepetitions, 0);
  const totalVolumeKg = sessions.reduce((total, session) => total + session.totalVolumeKg, 0);
  const totalAdditionalVolumeKg = sessions.reduce(
    (total, session) => total + session.totalAdditionalVolumeKg,
    0,
  );
  const totalDurationSeconds = sessions.reduce(
    (total, session) => total + session.totalDurationSeconds,
    0,
  );
  const totalDistanceMeters = sessions.reduce(
    (total, session) => total + session.totalDistanceMeters,
    0,
  );
  const sessionsWithEffectiveLoad = sessions.filter((session) => session.hasEffectiveLoadData);
  const bestLoadKg = sessionsWithEffectiveLoad.reduce(
    (best, session) => Math.max(best, session.bestLoadKg),
    0,
  );
  const averageLoadKg = sessionsWithEffectiveLoad.length === 0
    ? 0
    : roundToOneDecimal(
        sessionsWithEffectiveLoad.reduce(
          (total, session) => total + session.averageLoadKg * session.workingSetCount,
          0,
        ) / sessionsWithEffectiveLoad.reduce((total, session) => total + session.workingSetCount, 0),
      );
  const inputLoads = workingSets.map((set) => set.weightKg);
  const bestInputLoadKg = inputLoads.length === 0
    ? 0
    : trackingMode === 'assistedRepetitions'
      ? Math.min(...inputLoads)
      : Math.max(...inputLoads);
  const averageInputLoadKg = inputLoads.length === 0
    ? 0
    : roundToOneDecimal(inputLoads.reduce((total, value) => total + value, 0) / inputLoads.length);
  const bestRepetitions = sessions.reduce(
    (best, session) => Math.max(best, session.bestRepetitions),
    0,
  );
  const bestDurationSeconds = sessions.reduce(
    (best, session) => Math.max(best, session.bestDurationSeconds),
    0,
  );
  const bestDistanceMeters = sessions.reduce(
    (best, session) => Math.max(best, session.bestDistanceMeters),
    0,
  );
  const bestSetVolumeKg = sessions.reduce(
    (best, session) => Math.max(best, session.bestSetVolumeKg),
    0,
  );
  const bestSessionVolumeKg = sessions.reduce(
    (best, session) => Math.max(best, session.totalVolumeKg),
    0,
  );
  const estimatedOneRepMaxKg = sessions.reduce<number | undefined>((best, session) => {
    if (session.estimatedOneRepMaxKg === undefined) return best;
    return best === undefined
      ? session.estimatedOneRepMaxKg
      : Math.max(best, session.estimatedOneRepMaxKg);
  }, undefined);

  const latest = sessionsDescending[0];
  const previous = sessionsDescending[1];
  const comparison = latest && previous
    ? {
        latest,
        previous,
        volumeDeltaKg: roundToOneDecimal(latest.totalVolumeKg - previous.totalVolumeKg),
        ...(previous.totalVolumeKg === 0
          ? {}
          : {
              volumeDeltaPercent: roundToOneDecimal(
                ((latest.totalVolumeKg - previous.totalVolumeKg) / previous.totalVolumeKg) * 100,
              ),
            }),
        bestLoadDeltaKg: roundToOneDecimal(latest.bestLoadKg - previous.bestLoadKg),
        repetitionsDelta: latest.totalRepetitions - previous.totalRepetitions,
        averageLoadDeltaKg: roundToOneDecimal(latest.averageLoadKg - previous.averageLoadKg),
        additionalLoadDeltaKg: roundToOneDecimal(
          latest.maximumAdditionalLoadKg - previous.maximumAdditionalLoadKg,
        ),
        assistanceDeltaKg: roundToOneDecimal(
          latest.minimumAssistanceKg - previous.minimumAssistanceKg,
        ),
        durationDeltaSeconds: roundToOneDecimal(
          latest.totalDurationSeconds - previous.totalDurationSeconds,
        ),
        distanceDeltaMeters: roundToOneDecimal(
          latest.totalDistanceMeters - previous.totalDistanceMeters,
        ),
      }
    : undefined;

  return {
    trackingMode,
    summary: {
      sessionCount: sessions.length,
      workingSetCount,
      totalRepetitions,
      totalVolumeKg: roundToOneDecimal(totalVolumeKg),
      totalAdditionalVolumeKg: roundToOneDecimal(totalAdditionalVolumeKg),
      totalDurationSeconds: roundToOneDecimal(totalDurationSeconds),
      totalDistanceMeters: roundToOneDecimal(totalDistanceMeters),
      bestLoadKg: roundToOneDecimal(bestLoadKg),
      averageLoadKg,
      bestInputLoadKg,
      averageInputLoadKg,
      minimumAssistanceKg: trackingMode === 'assistedRepetitions' && inputLoads.length > 0
        ? Math.min(...inputLoads)
        : 0,
      maximumAdditionalLoadKg: trackingMode === 'bodyweightRepetitions' && inputLoads.length > 0
        ? Math.max(...inputLoads)
        : 0,
      bestRepetitions,
      bestDurationSeconds,
      bestDistanceMeters,
      bestSetVolumeKg: roundToOneDecimal(bestSetVolumeKg),
      bestSessionVolumeKg: roundToOneDecimal(bestSessionVolumeKg),
      hasEffectiveLoadData: sessionsWithEffectiveLoad.length > 0,
      ...(estimatedOneRepMaxKg === undefined ? {} : { estimatedOneRepMaxKg }),
    },
    sessions,
    loadRepetitionRecords: createLoadRepetitionRecords(history, trackingMode),
    ...(comparison ? { comparison } : {}),
  };
}
