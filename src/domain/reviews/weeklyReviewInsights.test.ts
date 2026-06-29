import { describe, expect, it } from 'vitest';

import type { Activity } from '@/domain/models/activity';
import type { WorkoutSession } from '@/domain/models/strength';
import type { WeeklyReview } from '@/domain/models/weeklyReview';
import { buildWeeklyReviewInsights } from '@/domain/reviews/weeklyReviewInsights';

function review(overrides: Partial<WeeklyReview> = {}): WeeklyReview {
  return {
    id: 'review',
    createdAt: '2026-06-15T08:00:00.000Z',
    updatedAt: '2026-06-15T08:00:00.000Z',
    weekStart: '2026-06-08',
    weekEnd: '2026-06-14',
    previousWeekStart: '2026-06-01',
    previousWeekEnd: '2026-06-07',
    weighInCount: 3,
    previousWeighInCount: 3,
    trackedFoodDays: 5,
    completedFoodDays: 5,
    calorieComparableDays: 5,
    targetWeightChangeKg: 0,
    proteinTargetDays: 5,
    stepGoalDays: 5,
    recordedStepDays: 7,
    isCalibrationEligible: true,
    ineligibilityReasons: [],
    rawProposedAdjustmentKcal: 0,
    proposedDecision: 'keep',
    proposedAdjustmentKcal: 0,
    currentCumulativeAdjustmentKcal: 0,
    resultingCumulativeAdjustmentKcal: 0,
    adherenceScore: 90,
    adherenceLevel: 'excellent',
    decisionStatus: 'pending',
    ...overrides,
  };
}

function workout(
  id: string,
  status: WorkoutSession['status'],
  plannedDate: string,
): WorkoutSession {
  return {
    id,
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
    date: plannedDate,
    plannedDate,
    plannedAt: '2026-06-01T08:00:00.000Z',
    status,
    ...(status === 'completed' ? { durationMinutes: 60 } : {}),
  };
}

describe('buildWeeklyReviewInsights', () => {
  it('calcule une adhérence unifiée musculation et endurance', () => {
    const result = buildWeeklyReviewInsights({
      review: review(),
      workoutSessions: [
        workout('strength-1', 'completed', '2026-06-09'),
        workout('strength-2', 'skipped', '2026-06-11'),
      ],
      activities: [
        {
          id: 'run',
          createdAt: '2026-06-10T08:00:00.000Z',
          updatedAt: '2026-06-10T08:00:00.000Z',
          date: '2026-06-10',
          type: 'running',
          durationMinutes: 45,
          intensity: 'moderate',
          sessionType: 'easy',
          distanceKm: 8,
          averageCadenceSpm: 170,
          calculation: {
            weightKg: 70,
            estimatedCaloriesKcal: 450,
            calculationVersion: 1,
          },
        } satisfies Activity,
      ],
      endurancePlanning: {
        plannedCount: 0,
        completedCount: 1,
        skippedCount: 0,
      },
    });

    expect(result.training.plannedSessions).toBe(3);
    expect(result.training.completedPlannedSessions).toBe(2);
    expect(result.training.adherencePercent).toBe(67);
    expect(result.training.activityMinutes).toBe(105);
    expect(result.training.runningDistanceKm).toBe(8);
  });

  it('n’invente pas de taux lorsqu’aucun planning n’existe', () => {
    const result = buildWeeklyReviewInsights({
      review: review({ completedFoodDays: 1, weighInCount: 1 }),
      workoutSessions: [],
      activities: [],
      endurancePlanning: {
        plannedCount: 0,
        completedCount: 0,
        skippedCount: 0,
      },
    });

    expect(result.training.hasPlanning).toBe(false);
    expect(result.training.adherencePercent).toBeUndefined();
    expect(result.attentionPoints).toContain(
      'Aucune activité sportive n’est enregistrée pour cette semaine.',
    );
    expect(result.recommendations).toHaveLength(3);
  });

  it('évite de compter deux fois une musculation enregistrée le même jour', () => {
    const completed = workout('strength', 'completed', '2026-06-09');
    const legacyActivity = {
      id: 'legacy-strength',
      createdAt: '2026-06-09T10:00:00.000Z',
      updatedAt: '2026-06-09T10:00:00.000Z',
      date: '2026-06-09',
      type: 'strengthTraining',
      durationMinutes: 60,
      intensity: 'moderate',
      met: 5,
      calculation: {
        weightKg: 70,
        estimatedCaloriesKcal: 350,
        calculationVersion: 1,
      },
    } satisfies Activity;

    const result = buildWeeklyReviewInsights({
      review: review(),
      workoutSessions: [completed],
      activities: [legacyActivity],
      endurancePlanning: {
        plannedCount: 0,
        completedCount: 0,
        skippedCount: 0,
      },
    });

    expect(result.training.actualSessions).toBe(1);
    expect(result.training.activityMinutes).toBe(60);
  });
});
