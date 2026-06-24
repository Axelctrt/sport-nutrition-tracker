import type { DatedEntity } from '@/domain/models/common';

export type StepsSource = 'manual';

export interface DailySteps extends DatedEntity {
  totalSteps: number;
  source: StepsSource;
}
