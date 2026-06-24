import type { DatedEntity, LocalTime } from '@/domain/models/common';

export type ActivityIntensity = 'low' | 'moderate' | 'high';

export type ActivityType =
  | 'running'
  | 'swimming'
  | 'strengthTraining'
  | 'cycling'
  | 'walking'
  | 'otherCardio';

export interface ActivityCalculationSnapshot {
  weightKg: number;
  estimatedCaloriesKcal: number;
  coefficientUsed?: number;
  metUsed?: number;
  calculationVersion: number;
}

export interface ActivityBase extends DatedEntity {
  type: ActivityType;
  time?: LocalTime;
  durationMinutes: number;
  intensity: ActivityIntensity;
  rpe: number;
  notes?: string;
  manualCaloriesKcal?: number;
  calculation: ActivityCalculationSnapshot;
}

export type RunningSessionType =
  | 'easy'
  | 'recovery'
  | 'longRun'
  | 'tempo'
  | 'intervals'
  | 'hills'
  | 'competition';

export interface RunningActivity extends ActivityBase {
  type: 'running';
  sessionType: RunningSessionType;
  distanceKm: number;
  averageCadenceSpm: number;
}

export type SwimmingSessionType =
  | 'recovery'
  | 'technique'
  | 'endurance'
  | 'tempo'
  | 'intervals'
  | 'competition';

export type MainStroke =
  | 'freestyle'
  | 'breaststroke'
  | 'backstroke'
  | 'butterfly'
  | 'mixed'
  | 'drills';

export interface SwimmingActivity extends ActivityBase {
  type: 'swimming';
  sessionType: SwimmingSessionType;
  mainStroke: MainStroke;
  distanceMeters: number;
}

export interface StrengthTrainingActivity extends ActivityBase {
  type: 'strengthTraining';
  met: number;
}

export interface OtherActivity extends ActivityBase {
  type: 'cycling' | 'walking' | 'otherCardio';
  met: number;
  includedInDailySteps: boolean;
}

export type Activity =
  | RunningActivity
  | SwimmingActivity
  | StrengthTrainingActivity
  | OtherActivity;
