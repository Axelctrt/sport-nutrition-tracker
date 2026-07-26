import type { DatedEntity } from '@/domain/models/common';
import type { OccupationalActivity } from '@/domain/models/profile';

export type StepsSource = 'manual';

export interface DailySteps extends DatedEntity {
  totalSteps: number;
  source: StepsSource;
}

export type ExpectedStepsConfidence = 'fallback' | 'emerging' | 'established';
export type ExpectedStepsSource = 'profileFallback' | 'recentBlend' | 'recentHistory';

export interface ExpectedStepsEstimate {
  expectedSteps: number;
  stepGoal: number;
  source: ExpectedStepsSource;
  confidence: ExpectedStepsConfidence;
  observedDayCount: number;
  observationWindowDays: number;
}

export interface ExpectedStepsInput {
  date: string;
  occupationalActivity: OccupationalActivity;
  stepGoal: number;
  includedBaseSteps: number;
  history: readonly DailySteps[];
}
