import { describe, expect, it } from 'vitest';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieWeeklyReviewRepository } from '@/infrastructure/repositories/dexie/DexieWeeklyReviewRepository';
import { createWeeklyReview } from '@/test/factories/weeklyReviewFactory';
import type { NewEntity } from '@/domain/models/common';
import type { CoachDecisionMemoryRecord } from '@/domain/coach/coachMemory';

function memory(reviewId: string, status: 'accepted' | 'rejected'): NewEntity<CoachDecisionMemoryRecord> {
  return {
    weeklyReviewId: reviewId, period: { weekStart: '2026-08-24', weekEnd: '2026-08-30' },
    decisionDate: '2026-08-30', phase: { id: 'deficit', label: 'Déficit actif', objective: 'loss' },
    coachState: 'truePlateau', confidence: { weight: 80, food: 80, activity: 80, recovery: 80, overall: 80, level: 'reliable' },
    primaryAction: 'reviewNutritionTarget', reasons: ['Plateau confirmé.'], blockingFactors: [],
    safety: { status: 'clear', reasons: [] }, proposedChange: { type: 'nutritionCalories', adjustmentKcalPerDay: 100 },
    status, decidedAt: '2026-08-30T12:00:00.000Z', nextReview: { type: 'date', date: '2026-09-06' },
  };
}

describe('DexieWeeklyReviewRepository et Coach Memory', () => {
  it.each(['accepted', 'rejected'] as const)('écrit atomiquement une décision %s avec le bilan', async (status) => {
    const database = new AppDatabase(`weekly-memory-${crypto.randomUUID()}`);
    await database.open();
    try {
      const review = { ...createWeeklyReview({ decisionStatus: 'pending' }), id: 'review-memory' };
      await database.weeklyReviews.add(review);
      const repository = new DexieWeeklyReviewRepository(database);
      if (status === 'accepted') {
        await repository.accept(review.weekStart, undefined, memory(review.id, status));
        await repository.accept(review.weekStart, undefined, memory(review.id, status));
      } else {
        await repository.reject(review.weekStart, memory(review.id, status));
        await repository.reject(review.weekStart, memory(review.id, status));
      }
      const storedReview = await database.weeklyReviews.get(review.id);
      const storedMemory = await database.coachDecisionMemories.get(`coach-decision:${review.id}`);
      expect(storedReview?.decisionStatus).toBe(status);
      expect(storedMemory).toMatchObject({ weeklyReviewId: review.id, status });
      expect(storedReview?.decidedAt).toBe(storedMemory?.decidedAt);
      expect(await database.coachDecisionMemories.count()).toBe(1);
    } finally {
      database.close();
      await database.delete();
    }
  });
});
