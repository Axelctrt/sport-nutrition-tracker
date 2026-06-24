import type { EntityId, LocalDate, NewEntity } from '@/domain/models/common';
import type { AcceptedCalorieAdjustment, WeeklyReview } from '@/domain/models/weeklyReview';

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
  ): Promise<WeeklyReviewDecisionResult>;
  reject(weekStart: LocalDate): Promise<WeeklyReview>;
  createAdjustment(data: NewEntity<AcceptedCalorieAdjustment>): Promise<AcceptedCalorieAdjustment>;
  listAdjustments(): Promise<AcceptedCalorieAdjustment[]>;
  getAdjustmentByReviewId(reviewId: EntityId): Promise<AcceptedCalorieAdjustment | undefined>;
}
