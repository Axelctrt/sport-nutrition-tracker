import type {
  CoachDecisionMemoryRecord,
} from '@/domain/coach/coachMemory';
import type { EntityId, NewEntity } from '@/domain/models/common';

export interface CoachMemoryRepository {
  getByWeeklyReviewId(
    weeklyReviewId: EntityId,
  ): Promise<CoachDecisionMemoryRecord | undefined>;
  listAll(): Promise<CoachDecisionMemoryRecord[]>;
  putIfAbsent(
    data: NewEntity<CoachDecisionMemoryRecord>,
  ): Promise<CoachDecisionMemoryRecord>;
}
