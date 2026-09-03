import type { EntityId, LocalDate, NewEntity } from '@/domain/models/common';
import type { AcceptedCalorieAdjustment, WeeklyReview } from '@/domain/models/weeklyReview';
import type { CoachDecisionMemoryRecord } from '@/domain/coach/coachMemory';

export interface WeeklyReviewDecisionResult {
  review: WeeklyReview;
  adjustment?: AcceptedCalorieAdjustment;
}

export interface WeeklyReviewRepository {
  getByWeekStart(weekStart: LocalDate): Promise<WeeklyReview | undefined>;
  listAll(): Promise<WeeklyReview[]>;
  upsert(data: NewEntity<WeeklyReview>): Promise<WeeklyReview>;
  accept(
    weekStart: LocalDate,
    adjustment?: NewEntity<AcceptedCalorieAdjustment>,
    memory?: NewEntity<CoachDecisionMemoryRecord>,
  ): Promise<WeeklyReviewDecisionResult>;
  reject(
    weekStart: LocalDate,
    memory?: NewEntity<CoachDecisionMemoryRecord>,
  ): Promise<WeeklyReview>;
  createAdjustment(data: NewEntity<AcceptedCalorieAdjustment>): Promise<AcceptedCalorieAdjustment>;
  listAdjustments(): Promise<AcceptedCalorieAdjustment[]>;
  getAdjustmentByReviewId(reviewId: EntityId): Promise<AcceptedCalorieAdjustment | undefined>;
}
