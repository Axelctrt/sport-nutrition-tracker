import type { ActivityType } from '@/domain/models/activity';
import type { LocalDate } from '@/domain/models/common';

export type PlannedActivitySource =
  | 'strengthSession'
  | 'endurancePlanning';

export interface PlannedActivityReference {
  source: PlannedActivitySource;
  sourceId: string;
}

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

export function plannedActivityReferenceKey(
  reference: PlannedActivityReference,
): string {
  return `${reference.source}:${reference.sourceId}`;
}

export function parsePlannedActivityReferenceKey(
  value: string | undefined,
): PlannedActivityReference | undefined {
  if (!value) return undefined;
  const separatorIndex = value.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    return undefined;
  }

  const source = value.slice(0, separatorIndex);
  const sourceId = value.slice(separatorIndex + 1);
  if (source !== 'strengthSession' && source !== 'endurancePlanning') {
    return undefined;
  }

  return { source, sourceId };
}

export function samePlannedActivityReference(
  left: PlannedActivityReference | undefined,
  right: PlannedActivityReference | undefined,
): boolean {
  if (!left || !right) return left === right;
  return left.source === right.source && left.sourceId === right.sourceId;
}
