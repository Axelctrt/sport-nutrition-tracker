import type { LocalDate, NewEntity } from '@/domain/models/common';
import type { DailySteps } from '@/domain/models/steps';

export interface StepsRepository {
  getByDate(date: LocalDate): Promise<DailySteps | undefined>;
  listBetween(from: LocalDate, to: LocalDate): Promise<DailySteps[]>;
  upsert(data: NewEntity<DailySteps>): Promise<DailySteps>;
  deleteByDate(date: LocalDate): Promise<void>;
}
