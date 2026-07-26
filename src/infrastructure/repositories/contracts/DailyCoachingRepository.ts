import type { LocalDate, NewEntity } from '@/domain/models/common';
import type {
  DailyActivityDecision,
  DailyCheckIn,
  DailyCheckOut,
} from '@/domain/models/dailyCoaching';

export interface DailyCoachingRepository {
  getCheckIn(date: LocalDate): Promise<DailyCheckIn | undefined>;
  getActivityDecision(date: LocalDate): Promise<DailyActivityDecision | undefined>;
  getCheckOut(date: LocalDate): Promise<DailyCheckOut | undefined>;
  upsertCheckIn(data: NewEntity<DailyCheckIn>): Promise<DailyCheckIn>;
  upsertActivityDecision(
    data: NewEntity<DailyActivityDecision>,
  ): Promise<DailyActivityDecision>;
  upsertCheckOut(data: NewEntity<DailyCheckOut>): Promise<DailyCheckOut>;
}
