import type { Activity } from '@/domain/models/activity';
import type { EntityId, LocalDate, NewEntity } from '@/domain/models/common';

export interface ActivityRepository {
  getById(id: EntityId): Promise<Activity | undefined>;
  listByDate(date: LocalDate): Promise<Activity[]>;
  listBetween(from: LocalDate, to: LocalDate): Promise<Activity[]>;
  create(data: NewEntity<Activity>): Promise<Activity>;
  save(activity: Activity): Promise<Activity>;
  delete(id: EntityId): Promise<void>;
}
