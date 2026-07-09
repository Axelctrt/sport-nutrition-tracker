import type { ActivityType } from '@/domain/models/activity';
import type { LocalDate } from '@/domain/models/common';

export type PlannedActivitySource =
  | 'strengthSession'
  | 'endurancePlanning';

export type PlannedActivityEstimateBasis =
  | 'plannedDuration'
  | 'actualDuration'
  | 'plannedDistance';

export interface PlannedActivityCalorieSnapshot {
  id: string;
  source: PlannedActivitySource;
  sourceId: string;
  title: string;
  date: LocalDate;
  activityType: ActivityType;
  estimatedCaloriesKcal: number;
  weightKg: number;
  calculationVersion: number;
  basis: PlannedActivityEstimateBasis;
  durationMinutes?: number;
  metUsed?: number;
  coefficientUsed?: number;
}
