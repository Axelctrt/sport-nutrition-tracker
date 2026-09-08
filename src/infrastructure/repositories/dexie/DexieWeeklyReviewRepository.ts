import type { EntityId, LocalDate, NewEntity } from '@/domain/models/common';
import type { AcceptedCalorieAdjustment, WeeklyReview } from '@/domain/models/weeklyReview';
import {
  coachDecisionMemoryIdForReview,
  type CoachDecisionMemoryRecord,
} from '@/domain/coach/coachMemory';
import { weeklyReviewIdForWeekStart } from '@/domain/sync/deterministicEntityIds';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type {
  WeeklyReviewDecisionResult,
  WeeklyReviewRepository,
} from '@/infrastructure/repositories/contracts/WeeklyReviewRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { updateStoredEntity } from '@/infrastructure/repositories/dexie/updateStoredEntity';
import { createEntity, currentIsoDateTime } from '@/shared/utils/entities';

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
      if (current) {
        return updateStoredEntity(this.database.weeklyReviews, current, data);
      }

      const review = createEntity<WeeklyReview>(
        data,
        weeklyReviewIdForWeekStart(data.weekStart),
      );
      await this.database.weeklyReviews.add(review);
      return review;
    }, { syncDomainIds: ['nutrition-tracking'], syncReason: 'weekly-review-write' });
  }

  accept(
    weekStart: LocalDate,
    adjustmentData?: NewEntity<AcceptedCalorieAdjustment>,
    memoryData?: NewEntity<CoachDecisionMemoryRecord>,
  ): Promise<WeeklyReviewDecisionResult> {
    return runRepositoryOperation('update', 'Impossible d’accepter ce bilan hebdomadaire.', () => (
      this.database.transaction(
        'rw',
        this.database.weeklyReviews,
        this.database.acceptedCalorieAdjustments,
        this.database.coachDecisionMemories,
        async () => {
          const current = await this.database.weeklyReviews.where('weekStart').equals(weekStart).first();
          if (!current) throw new Error('Bilan hebdomadaire introuvable.');
          if (current.decisionStatus === 'accepted') {
            const existing = await this.database.acceptedCalorieAdjustments
              .filter((item) => item.weeklyReviewId === current.id)
              .first();
            return { review: current, ...(existing ? { adjustment: existing } : {}) };
          }
          const decidedAt = memoryData?.decidedAt ?? currentIsoDateTime();
          const review = await updateStoredEntity(
            this.database.weeklyReviews,
            current,
            { decisionStatus: 'accepted', decidedAt },
            decidedAt,
          );
          if (memoryData) {
            const memoryId = coachDecisionMemoryIdForReview(current.id);
            const existingMemory = await this.database.coachDecisionMemories.get(memoryId);
            if (!existingMemory) {
              await this.database.coachDecisionMemories.add(
                createEntity<CoachDecisionMemoryRecord>(memoryData, memoryId, memoryData.decidedAt),
              );
            }
          }
          if (!adjustmentData) return { review };
          const adjustment = createEntity<AcceptedCalorieAdjustment>(adjustmentData, undefined, decidedAt);
          await this.database.acceptedCalorieAdjustments.add(adjustment);
          return { review, adjustment };
        },
      )
    ), { syncDomainIds: ['nutrition-tracking'], syncReason: 'weekly-review-write' });
  }

  reject(
    weekStart: LocalDate,
    memoryData?: NewEntity<CoachDecisionMemoryRecord>,
  ): Promise<WeeklyReview> {
    return runRepositoryOperation('update', 'Impossible de refuser ce bilan hebdomadaire.', () => (
      this.database.transaction(
        'rw',
        this.database.weeklyReviews,
        this.database.coachDecisionMemories,
        async () => {
          const current = await this.database.weeklyReviews.where('weekStart').equals(weekStart).first();
          if (!current) throw new Error('Bilan hebdomadaire introuvable.');
          if (current.decisionStatus === 'rejected') return current;
          const decidedAt = memoryData?.decidedAt ?? currentIsoDateTime();
          const review = await updateStoredEntity(
            this.database.weeklyReviews,
            current,
            { decisionStatus: 'rejected', decidedAt },
            decidedAt,
          );
          if (memoryData) {
            const memoryId = coachDecisionMemoryIdForReview(current.id);
            const existingMemory = await this.database.coachDecisionMemories.get(memoryId);
            if (!existingMemory) {
              await this.database.coachDecisionMemories.add(
                createEntity<CoachDecisionMemoryRecord>(memoryData, memoryId, memoryData.decidedAt),
              );
            }
          }
          return review;
        },
      )
    ), { syncDomainIds: ['nutrition-tracking'], syncReason: 'weekly-review-write' });
  }

  createAdjustment(data: NewEntity<AcceptedCalorieAdjustment>): Promise<AcceptedCalorieAdjustment> {
    return runRepositoryOperation('create', 'Impossible d’enregistrer cet ajustement calorique.', async () => {
      const adjustment = createEntity<AcceptedCalorieAdjustment>(data);
      await this.database.acceptedCalorieAdjustments.add(adjustment);
      return adjustment;
    }, { syncDomainIds: ['nutrition-tracking'], syncReason: 'weekly-review-write' });
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
