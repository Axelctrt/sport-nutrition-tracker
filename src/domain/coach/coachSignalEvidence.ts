import type { LocalDate } from '@/domain/models/common';
import type {
  DailyCheckIn,
  DailyCheckOut,
  DailySignalProvenance,
} from '@/domain/models/dailyCoaching';
import type { WeightEntry } from '@/domain/models/weight';
import type { ReferenceWeightResolution } from '@/domain/calculations/referenceWeight';

export type CoachSignalProvenance =
  | 'userMeasured'
  | 'userReported'
  | 'derived'
  | 'profileInitialization'
  | 'profileFallback'
  | 'legacyUnknown';

export type CoachSignalConfidence =
  | 'confirmed'
  | 'derived'
  | 'fallback'
  | 'unknown';

export interface CoachSignalEvidence<T> {
  value: T;
  date: LocalDate;
  provenance: CoachSignalProvenance;
  confidence: CoachSignalConfidence;
}

export function resolveWeightEntryEvidence(
  entry: WeightEntry,
): CoachSignalEvidence<number> {
  if (entry.provenance === 'userMeasurement') {
    return {
      value: entry.weightKg,
      date: entry.date,
      provenance: 'userMeasured',
      confidence: 'confirmed',
    };
  }

  if (entry.provenance === 'profileInitialization') {
    return {
      value: entry.weightKg,
      date: entry.date,
      provenance: 'profileInitialization',
      confidence: 'fallback',
    };
  }

  return {
    value: entry.weightKg,
    date: entry.date,
    provenance: 'legacyUnknown',
    confidence: 'unknown',
  };
}

function resolveUserReportedEvidence<T>(
  value: T | undefined,
  date: LocalDate,
  provenance: DailySignalProvenance | undefined,
): CoachSignalEvidence<T> | undefined {
  if (value === undefined) return undefined;
  return provenance === 'userReported'
    ? { value, date, provenance: 'userReported', confidence: 'confirmed' }
    : { value, date, provenance: 'legacyUnknown', confidence: 'unknown' };
}

export function resolveDailyCheckInSignalEvidence(
  checkIn: DailyCheckIn,
  signal: 'sleepQuality' | 'readiness',
): CoachSignalEvidence<NonNullable<DailyCheckIn[typeof signal]>> | undefined {
  return resolveUserReportedEvidence(
    checkIn[signal],
    checkIn.date,
    checkIn.signalProvenance?.[signal],
  );
}

export function resolveDailyCheckOutSignalEvidence(
  checkOut: DailyCheckOut,
  signal: 'hunger' | 'energy',
): CoachSignalEvidence<NonNullable<DailyCheckOut[typeof signal]>> | undefined {
  return resolveUserReportedEvidence(
    checkOut[signal],
    checkOut.date,
    checkOut.signalProvenance?.[signal],
  );
}

export function resolveReferenceWeightEvidence(
  date: LocalDate,
  resolution: ReferenceWeightResolution,
): CoachSignalEvidence<number> {
  return resolution.source === 'previousWeekAverage'
    ? {
        value: resolution.weightKg,
        date,
        provenance: 'derived',
        confidence: 'derived',
      }
    : {
        value: resolution.weightKg,
        date,
        provenance: 'profileFallback',
        confidence: 'fallback',
      };
}
