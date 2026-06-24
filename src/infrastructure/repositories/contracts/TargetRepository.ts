import type { LocalDate, NewEntity } from '@/domain/models/common';
import type { DailyJournalStatus } from '@/domain/models/food';
import type { DailyTarget } from '@/domain/models/targets';

export interface TargetRepository {
  getTargetByDate(date: LocalDate): Promise<DailyTarget | undefined>;
  listTargetsBetween(from: LocalDate, to: LocalDate): Promise<DailyTarget[]>;
  upsertTarget(data: NewEntity<DailyTarget>): Promise<DailyTarget>;
  getJournalStatus(date: LocalDate): Promise<DailyJournalStatus | undefined>;
  upsertJournalStatus(data: NewEntity<DailyJournalStatus>): Promise<DailyJournalStatus>;
}
