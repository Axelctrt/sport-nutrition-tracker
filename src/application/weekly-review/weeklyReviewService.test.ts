import { describe, expect, it, vi } from 'vitest';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { WeeklyReview } from '@/domain/models/weeklyReview';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';
import {
  acceptWeeklyReview,
  loadWeeklyReview,
  rejectWeeklyReview,
  type WeeklyReviewServiceDependencies,
} from '@/application/weekly-review/weeklyReviewService';

function createDependencies(existing?: WeeklyReview): WeeklyReviewServiceDependencies {
  let stored = existing;
  return {
    settings: { get: vi.fn().mockResolvedValue(createDefaultAppSettings()) },
    weight: { listBetween: vi.fn().mockImplementation((from: string) => Promise.resolve(from === '2026-06-08' ? [
      createEntity({ date: '2026-06-08', weightKg: 69.6 }, 'w1'),
      createEntity({ date: '2026-06-10', weightKg: 69.5 }, 'w2'),
      createEntity({ date: '2026-06-12', weightKg: 69.4 }, 'w3'),
    ] : [createEntity({ date: '2026-06-01', weightKg: 70 }, 'wp')])) },
    food: { listEntriesBetween: vi.fn().mockResolvedValue([]), listJournalStatusesBetween: vi.fn().mockResolvedValue([]) },
    steps: { listBetween: vi.fn().mockResolvedValue([]) },
    targets: { listTargetsBetween: vi.fn().mockResolvedValue([]) },
    weeklyReviews: {
      getByWeekStart: vi.fn().mockImplementation(() => Promise.resolve(stored)),
      upsert: vi.fn().mockImplementation((data) => { stored = createEntity(data, stored?.id ?? 'review'); return Promise.resolve(stored); }),
      listAll: vi.fn().mockImplementation(() => Promise.resolve(stored ? [stored] : [])),
      listAdjustments: vi.fn().mockResolvedValue([]),
      accept: vi.fn().mockImplementation((_week, adjustment) => {
        if (!stored) throw new Error('missing');
        stored = { ...stored, decisionStatus: 'accepted' };
        return Promise.resolve({ review: stored, ...(adjustment ? { adjustment: createEntity(adjustment, 'adjustment') } : {}) });
      }),
      reject: vi.fn().mockImplementation(() => {
        if (!stored) throw new Error('missing');
        stored = { ...stored, decisionStatus: 'rejected' };
        return Promise.resolve(stored);
      }),
    },
  };
}

function eligibleReview(): WeeklyReview {
  return createEntity({
    weekStart: '2026-06-08', weekEnd: '2026-06-14', previousWeekStart: '2026-06-01', previousWeekEnd: '2026-06-07',
    weighInCount: 3, previousWeighInCount: 1, trackedFoodDays: 4, completedFoodDays: 4, calorieComparableDays: 4,
    averageWeightKg: 69.5, previousAverageWeightKg: 70, actualWeightChangeKg: -0.5, targetWeightChangeKg: -0.35,
    averageConsumedCaloriesKcal: 2000, averageTargetCaloriesKcal: 2000, calorieDeviationPercent: 0, calorieAdherencePercent: 100,
    proteinTargetDays: 4, stepGoalDays: 4, recordedStepDays: 4, isCalibrationEligible: true, ineligibilityReasons: [],
    rawProposedAdjustmentKcal: 165, proposedDecision: 'increase', proposedAdjustmentKcal: 100,
    currentCumulativeAdjustmentKcal: 0, resultingCumulativeAdjustmentKcal: 100,
    adherenceScore: 80, adherenceLevel: 'good', decisionStatus: 'pending',
  }, 'review');
}

describe('weekly review service', () => {
  const profile = createEntity(createProfileInput({ goal: 'loss', targetWeeklyWeightChangePercent: -0.5 }), 'profile');

  it('calcule et persiste un bilan non encore décidé', async () => {
    const dependencies = createDependencies();
    const result = await loadWeeklyReview('2026-06-10', profile, dependencies);
    expect(result.review.weekStart).toBe('2026-06-08');
    expect(dependencies.weeklyReviews.upsert).toHaveBeenCalledOnce();
  });

  it('ne recalcule pas un bilan déjà accepté', async () => {
    const dependencies = createDependencies({ ...eligibleReview(), decisionStatus: 'accepted' });
    const result = await loadWeeklyReview('2026-06-10', profile, dependencies);
    expect(result.review.decisionStatus).toBe('accepted');
    expect(dependencies.weeklyReviews.upsert).not.toHaveBeenCalled();
  });

  it('accepte une proposition et crée un ajustement effectif la semaine suivante', async () => {
    const dependencies = createDependencies(eligibleReview());
    await acceptWeeklyReview('2026-06-08', dependencies);
    expect(dependencies.weeklyReviews.accept).toHaveBeenCalledWith('2026-06-08', expect.objectContaining({ effectiveFrom: '2026-06-15', adjustmentKcalPerDay: 100 }));
  });

  it('enregistre un refus explicite', async () => {
    const dependencies = createDependencies(eligibleReview());
    const review = await rejectWeeklyReview('2026-06-08', dependencies);
    expect(review.decisionStatus).toBe('rejected');
  });
});
