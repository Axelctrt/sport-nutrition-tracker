import type { EntityId, LocalDate, NewEntity } from '@/domain/models/common';
import type { AcceptedCalorieAdjustment, WeeklyReview } from '@/domain/models/weeklyReview';
import { weeklyReviewIdForWeekStart } from '@/domain/sync/deterministicEntityIds';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type {
  WeeklyReviewDecisionResult,
  WeeklyReviewRepository,
} from '@/infrastructure/repositories/contracts/WeeklyReviewRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { createEntity, currentIsoDateTime, updateEntity } from '@/shared/utils/entities';

export class DexieWeeklyReviewRepository implements WeeklyReviewRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  getByWeekStart(weekStart: LocalDate): Promise<WeeklyReview | undefined> {
    return runRepositoryOperation('read', 'Impossible de lire ce bilan hebdomadaire.', () => (
      this.database.weeklyReviews.where('weekStart').equals(weekStart).first()
    ));
  }

  listAll(): Promise<WeeklyReview[]> {
    return runRepositoryOperation('read', 'Impossible de charger les bilans hebdomadaires.', () => (
      this.database.weeklyReviews.orderBy('weekStart').reverse().toArray()
    ));
  }

  upsert(data: NewEntity<WeeklyReview>): Promise<WeeklyReview> {
    return runRepositoryOperation('update', 'Impossible d’enregistrer ce bilan hebdomadaire.', async () => {
      const current = await this.database.weeklyReviews.where('weekStart').equals(data.weekStart).first();
      const review = current ? updateEntity(current, data) : createEntity<WeeklyReview>(
        data,
        weeklyReviewIdForWeekStart(data.weekStart),
      );
      await this.database.weeklyReviews.put(review);
      return review;
    });
  }

  accept(
    weekStart: LocalDate,
    adjustmentData?: NewEntity<AcceptedCalorieAdjustment>,
  ): Promise<WeeklyReviewDecisionResult> {
    return runRepositoryOperation('update', 'Impossible d’accepter ce bilan hebdomadaire.', () => (
      this.database.transaction(
        'rw',
        this.database.weeklyReviews,
        this.database.acceptedCalorieAdjustments,
        async () => {
          const current = await this.database.weeklyReviews.where('weekStart').equals(weekStart).first();
          if (!current) throw new Error('Bilan hebdomadaire introuvable.');
          if (current.decisionStatus === 'accepted') {
            const existing = await this.database.acceptedCalorieAdjustments
              .filter((item) => item.weeklyReviewId === current.id)
              .first();
            return { review: current, ...(existing ? { adjustment: existing } : {}) };
          }
          const decidedAt = currentIsoDateTime();
          const review = updateEntity(current, { decisionStatus: 'accepted', decidedAt }, decidedAt);
          await this.database.weeklyReviews.put(review);
          if (!adjustmentData) return { review };
          const adjustment = createEntity<AcceptedCalorieAdjustment>(adjustmentData, undefined, decidedAt);
          await this.database.acceptedCalorieAdjustments.add(adjustment);
          return { review, adjustment };
        },
      )
    ));
  }

  reject(weekStart: LocalDate): Promise<WeeklyReview> {
    return runRepositoryOperation('update', 'Impossible de refuser ce bilan hebdomadaire.', async () => {
      const current = await this.database.weeklyReviews.where('weekStart').equals(weekStart).first();
      if (!current) throw new Error('Bilan hebdomadaire introuvable.');
      const decidedAt = currentIsoDateTime();
      const review = updateEntity(current, { decisionStatus: 'rejected', decidedAt }, decidedAt);
      await this.database.weeklyReviews.put(review);
      return review;
    });
  }

  createAdjustment(data: NewEntity<AcceptedCalorieAdjustment>): Promise<AcceptedCalorieAdjustment> {
    return runRepositoryOperation('create', 'Impossible d’enregistrer cet ajustement calorique.', async () => {
      const adjustment = createEntity<AcceptedCalorieAdjustment>(data);
      await this.database.acceptedCalorieAdjustments.add(adjustment);
      return adjustment;
    });
  }

  listAdjustments(): Promise<AcceptedCalorieAdjustment[]> {
    return runRepositoryOperation('read', 'Impossible de charger les ajustements caloriques.', () => (
      this.database.acceptedCalorieAdjustments.orderBy('effectiveFrom').toArray()
    ));
  }

  getAdjustmentByReviewId(reviewId: EntityId): Promise<AcceptedCalorieAdjustment | undefined> {
    return runRepositoryOperation('read', 'Impossible de charger cet ajustement calorique.', () => (
      this.database.acceptedCalorieAdjustments.filter((item) => item.weeklyReviewId === reviewId).first()
    ));
  }
}
