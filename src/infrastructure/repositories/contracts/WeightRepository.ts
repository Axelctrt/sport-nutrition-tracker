import type { LocalDate, NewEntity } from '@/domain/models/common';
import type { WeightEntry } from '@/domain/models/weight';

export interface WeightRepository {
  getByDate(date: LocalDate): Promise<WeightEntry | undefined>;
  getLatestOnOrBefore(date: LocalDate): Promise<WeightEntry | undefined>;
  listAll(): Promise<WeightEntry[]>;
  listBetween(from: LocalDate, to: LocalDate): Promise<WeightEntry[]>;
  upsert(data: NewEntity<WeightEntry>): Promise<WeightEntry>;
  deleteByDate(date: LocalDate): Promise<void>;
}
