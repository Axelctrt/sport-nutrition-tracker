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
  /** Ancienne valeur conservée uniquement pour compatibilité des données historiques. */
  rpe?: number;
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

export type RunningTerrainType = 'road' | 'track' | 'trail' | 'treadmill' | 'mixed';

export interface RunningActivity extends ActivityBase {
  type: 'running';
  sessionType: RunningSessionType;
  distanceKm: number;
  averageCadenceSpm: number;
  elevationGainMeters?: number;
  terrainType?: RunningTerrainType;
  intervalDetails?: string;
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

export type PoolLengthMeters = 25 | 50;

export interface SwimmingActivity extends ActivityBase {
  type: 'swimming';
  sessionType: SwimmingSessionType;
  mainStroke: MainStroke;
  distanceMeters: number;
  poolLengthMeters?: PoolLengthMeters;
  intervalDetails?: string;
}

export type CyclingBikeType = 'road' | 'gravel' | 'mountain' | 'city' | 'indoor' | 'other';
export type CyclingEnvironment = 'outdoor' | 'indoor';

export interface CyclingActivity extends ActivityBase {
  type: 'cycling';
  met: number;
  includedInDailySteps: false;
  distanceKm?: number;
  elevationGainMeters?: number;
  bikeType?: CyclingBikeType;
  environment?: CyclingEnvironment;
  intervalDetails?: string;
}

export interface StrengthTrainingActivity extends ActivityBase {
  type: 'strengthTraining';
  met: number;
}

export interface OtherActivity extends ActivityBase {
  type: 'walking' | 'otherCardio';
  met: number;
  includedInDailySteps: boolean;
}

export type EnduranceActivity = RunningActivity | SwimmingActivity | CyclingActivity;

export type Activity =
  | RunningActivity
  | SwimmingActivity
  | CyclingActivity
  | StrengthTrainingActivity
  | OtherActivity;

export type EnduranceTemplateType = EnduranceActivity['type'];

export interface EnduranceTemplate {
  id: string;
  name: string;
  activityType: EnduranceTemplateType;
  durationMinutes: number;
  intensity: ActivityIntensity;
  notes?: string;
  runningSessionType?: RunningSessionType;
  distanceKm?: number;
  averageCadenceSpm?: number;
  elevationGainMeters?: number;
  terrainType?: RunningTerrainType;
  swimmingSessionType?: SwimmingSessionType;
  mainStroke?: MainStroke;
  distanceMeters?: number;
  poolLengthMeters?: PoolLengthMeters;
  cyclingMet?: number;
  bikeType?: CyclingBikeType;
  cyclingEnvironment?: CyclingEnvironment;
  intervalDetails?: string;
}
