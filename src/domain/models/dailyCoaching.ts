import type {
  DatedEntity,
  EntityId,
  IsoDateTime,
} from '@/domain/models/common';

export const DAILY_CONTEXT_FLAGS = [
  'menstrualCycle',
  'illness',
  'painOrInjury',
  'travel',
  'exceptionalPoorSleep',
  'highSodiumMeal',
  'creatineChange',
  'muscleSoreness',
  'other',
] as const;

export type DailyContextFlag = (typeof DAILY_CONTEXT_FLAGS)[number];
export type DailySignalLevel = 'low' | 'normal' | 'high';
export type DailyContextSyncPreference = 'localOnly' | 'account';
export type DailySignalProvenance = 'userReported';

export interface DailyCheckInSignalProvenance {
  sleepQuality?: DailySignalProvenance;
  readiness?: DailySignalProvenance;
}

export interface DailyCheckOutSignalProvenance {
  hunger?: DailySignalProvenance;
  energy?: DailySignalProvenance;
}

export interface DailyCheckIn extends DatedEntity {
  weightEntryId?: EntityId;
  sleepDurationMinutes?: number;
  sleepQuality?: 'poor' | 'average' | 'good';
  readiness?: DailySignalLevel;
  signalProvenance?: DailyCheckInSignalProvenance;
  waistCm?: number;
  contextFlags: DailyContextFlag[];
  contextSyncPreference: DailyContextSyncPreference;
  completedAt: IsoDateTime;
}

export interface DailyActivityDecision extends DatedEntity {
  decision: 'open' | 'rest' | 'activities';
  confirmedAt?: IsoDateTime;
}

export interface DailyCheckOut extends DatedEntity {
  stepsEntryId?: EntityId;
  hunger?: DailySignalLevel;
  energy?: DailySignalLevel;
  signalProvenance?: DailyCheckOutSignalProvenance;
  foodJournalComplete: boolean;
  contextFlags: DailyContextFlag[];
  contextSyncPreference: DailyContextSyncPreference;
  completedAt: IsoDateTime;
}
