import type { ExerciseHistoryEntry } from '@/application/strength/strengthHistoryService';

export interface StrengthSessionAnalyticsPoint {
  sessionId: string;
  date: string;
  sessionName: string;
  workingSetCount: number;
  totalRepetitions: number;
  totalVolumeKg: number;
  bestLoadKg: number;
  averageLoadKg: number;
  bestSetVolumeKg: number;
  estimatedOneRepMaxKg?: number;
}

export interface StrengthLoadRepetitionRecord {
  weightKg: number;
  repetitions: number;
  sessionId: string;
  date: string;
}

export interface StrengthExerciseComparison {
  latest: StrengthSessionAnalyticsPoint;
  previous: StrengthSessionAnalyticsPoint;
  volumeDeltaKg: number;
  volumeDeltaPercent?: number;
  bestLoadDeltaKg: number;
  repetitionsDelta: number;
  averageLoadDeltaKg: number;
}

export interface StrengthExerciseAnalyticsSummary {
  sessionCount: number;
  workingSetCount: number;
  totalRepetitions: number;
  totalVolumeKg: number;
  bestLoadKg: number;
  averageLoadKg: number;
  bestRepetitions: number;
  bestSetVolumeKg: number;
  bestSessionVolumeKg: number;
  estimatedOneRepMaxKg?: number;
}

export interface StrengthExerciseAnalytics {
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

function createSessionPoint(entry: ExerciseHistoryEntry): StrengthSessionAnalyticsPoint | undefined {
  if (entry.workingSets.length === 0) return undefined;

  const workingSetCount = entry.workingSets.length;
  const totalRepetitions = entry.workingSets.reduce((total, set) => total + set.repetitions, 0);
  const totalLoad = entry.workingSets.reduce((total, set) => total + set.weightKg, 0);
  const bestLoadKg = entry.workingSets.reduce((best, set) => Math.max(best, set.weightKg), 0);
  const bestSetVolumeKg = entry.workingSets.reduce(
    (best, set) => Math.max(best, set.weightKg * set.repetitions),
    0,
  );
  const estimatedOneRepMaxKg = entry.workingSets.reduce<number | undefined>((best, set) => {
    const estimate = calculateEstimatedOneRepMax(set.weightKg, set.repetitions);
    if (estimate === undefined) return best;
    return best === undefined ? estimate : Math.max(best, estimate);
  }, undefined);

  return {
    sessionId: entry.session.id,
    date: entry.session.date,
    sessionName: entry.session.sourceTemplateNameSnapshot ?? 'Séance libre',
    workingSetCount,
    totalRepetitions,
    totalVolumeKg: roundToOneDecimal(entry.totalVolumeKg),
    bestLoadKg,
    averageLoadKg: roundToOneDecimal(totalLoad / workingSetCount),
    bestSetVolumeKg: roundToOneDecimal(bestSetVolumeKg),
    ...(estimatedOneRepMaxKg === undefined ? {} : { estimatedOneRepMaxKg }),
  };
}

function createLoadRepetitionRecords(
  history: ExerciseHistoryEntry[],
): StrengthLoadRepetitionRecord[] {
  const records = new Map<number, StrengthLoadRepetitionRecord>();

  for (const entry of history) {
    for (const set of entry.workingSets) {
      const current = records.get(set.weightKg);
      if (!current || set.repetitions > current.repetitions) {
        records.set(set.weightKg, {
          weightKg: set.weightKg,
          repetitions: set.repetitions,
          sessionId: entry.session.id,
          date: entry.session.date,
        });
      }
    }
  }

  return [...records.values()].sort((left, right) => (
    right.weightKg - left.weightKg || right.repetitions - left.repetitions
  ));
}

export function buildStrengthExerciseAnalytics(
  history: ExerciseHistoryEntry[],
): StrengthExerciseAnalytics {
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
  const totalRepetitions = workingSets.reduce((total, set) => total + set.repetitions, 0);
  const totalVolumeKg = sessions.reduce((total, session) => total + session.totalVolumeKg, 0);
  const totalLoad = workingSets.reduce((total, set) => total + set.weightKg, 0);
  const bestLoadKg = workingSets.reduce((best, set) => Math.max(best, set.weightKg), 0);
  const bestRepetitions = workingSets.reduce((best, set) => Math.max(best, set.repetitions), 0);
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
      }
    : undefined;

  return {
    summary: {
      sessionCount: sessions.length,
      workingSetCount,
      totalRepetitions,
      totalVolumeKg: roundToOneDecimal(totalVolumeKg),
      bestLoadKg,
      averageLoadKg: workingSetCount === 0 ? 0 : roundToOneDecimal(totalLoad / workingSetCount),
      bestRepetitions,
      bestSetVolumeKg: roundToOneDecimal(bestSetVolumeKg),
      bestSessionVolumeKg: roundToOneDecimal(bestSessionVolumeKg),
      ...(estimatedOneRepMaxKg === undefined ? {} : { estimatedOneRepMaxKg }),
    },
    sessions,
    loadRepetitionRecords: createLoadRepetitionRecords(history),
    ...(comparison ? { comparison } : {}),
  };
}
