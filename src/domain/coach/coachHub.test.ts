import { describe, expect, it } from 'vitest';
import { buildCoachHubSnapshot } from '@/domain/coach/coachHub';
import { resolveCoachPhase } from '@/domain/coach/coachPhase';
import type { CoachReviewSnapshot } from '@/domain/coach/coachReview';
import type { DailyCoachResult } from '@/domain/coach/dailyCoach';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';
import { createWeeklyReview } from '@/test/factories/weeklyReviewFactory';
import { createCoachSafetyAssessment } from '@/test/factories/coachSafetyFactory';

const dailyResult: DailyCoachResult = {
  verdict: 'planMaintained',
  title: 'Plan maintenu',
  message: 'Les signaux restent cohérents.',
  priority: 'low',
  coachState: 'onTrack',
  confidence: {
    weight: 80,
    food: 80,
    activity: 80,
    recovery: 80,
    overall: 80,
    level: 'reliable',
  },
};

function coachReview(): CoachReviewSnapshot {
  return {
    referenceDate: '2026-08-28',
    period: { weekStart: '2026-08-24', weekEnd: '2026-08-30' },
    diagnostic: { state: 'onTrack', label: 'Progression conforme' },
    confidence: dailyResult.confidence,
    reasons: ['Le plan reste cohérent.', 'La récupération reste stable.'],
    primaryReasons: ['Le plan reste cohérent.', 'La récupération reste stable.'],
    blockingFactors: ['Trois pesées sont encore nécessaires.'],
    signals: {
      body: { weighInCount: 1 },
      nutrition: { completedFoodDays: 2, comparableFoodDays: 2 },
      activity: { recordedStepDays: 2 },
      recovery: { signalDays: 1, concernDays: 0 },
      strength: {
        context: 'insufficient',
        exploitableExerciseCount: 0,
        schedule: {
          completedPlannedCount: 0,
          skippedCount: 0,
          overdueCount: 0,
          abandonedCount: 0,
        },
      },
    },
    decision: {
      referenceDate: '2026-08-28',
      primaryAction: 'maintainPlan',
      priority: 'low',
      coachState: 'onTrack',
      strengthContext: 'insufficient',
      safetyAssessment: createCoachSafetyAssessment({ referenceDate: '2026-08-28' }),
      reasons: [],
      blockingFactors: [],
      requiresUserAcceptance: false,
      nextReview: { type: 'date', date: '2026-09-04' },
    },
    safetyAssessment: createCoachSafetyAssessment({ referenceDate: '2026-08-28' }),
    plan: {
      action: 'maintainPlan',
      label: 'Maintenir le plan',
      requiresUserAcceptance: false,
    },
    nextReview: { type: 'date', date: '2026-09-04' },
    calorieAssessment: {
      calculationVersion: 1,
      analysisStart: '2026-08-08',
      analysisEnd: '2026-08-28',
      trackingSpanDays: 21,
      weighInCount: 1,
      completedFoodDays: 2,
      comparableFoodDays: 2,
      recordedStepDays: 2,
      recoverySignalDays: 1,
      recoveryConcernDays: 0,
      contextDayCount: 1,
      strengthSessionCount: 0,
      confidence: dailyResult.confidence,
      detectedState: 'onTrack',
      reasons: [],
      blockingFactors: [],
      rawWeightBasedAdjustmentKcal: 0,
      proposedAdjustmentKcal: 0,
    },
  };
}

describe('buildCoachHubSnapshot', () => {
  it('construit le Hub à partir des données existantes et de la projection C5', () => {
    const profile = createEntity(createProfileInput({ goal: 'loss', dailyStepGoal: 8_500 }));
    const older = createWeeklyReview({ weekStart: '2026-08-03', weekEnd: '2026-08-09' });
    const latest = createWeeklyReview({ weekStart: '2026-08-10', weekEnd: '2026-08-16' });
    const snapshot = buildCoachHubSnapshot({
      referenceDate: '2026-08-28',
      profile,
      hasCheckIn: true,
      coachPhase: resolveCoachPhase(profile.goal)!,
      dailyCoachResult: dailyResult,
      target: createEntity({
        date: '2026-08-28',
        calculationWeightKg: 60,
        energy: {
          bmrKcal: 1_500,
          occupationalBaseKcal: 1_800,
          walkingKcal: 200,
          runningKcal: 0,
          swimmingKcal: 0,
          strengthTrainingKcal: 0,
          otherActivitiesKcal: 0,
          totalEstimatedExpenditureKcal: 2_000,
        },
        goalAdjustmentKcal: -200,
        acceptedCalibrationAdjustmentKcal: 0,
        calorieFloorKcal: 1_500,
        targetCaloriesKcal: 1_800,
        macros: { proteinGrams: 120, carbohydratesGrams: 190, fatGrams: 60 },
        calculationVersion: 4,
      }),
      plannedSessions: [{
        id: 'session-1',
        source: 'strength',
        title: 'Full body',
        date: '2026-08-29',
        status: 'upcoming',
      }],
      coachReview: coachReview(),
      reviews: [latest, older],
    });

    expect(snapshot).toMatchObject({
      referenceDate: '2026-08-28',
      dailyVerdict: { status: 'available', result: dailyResult },
      orientation: 'loss',
      coachPhase: {
        status: 'available',
        phase: { id: 'deficit', label: 'Déficit actif', objective: 'loss' },
      },
      nutritionPlan: { status: 'available', targetCaloriesKcal: 1_800 },
      activityPlan: { dailyStepGoal: 8_500 },
      trainingPlan: { nextSession: { id: 'session-1' } },
      priority: {
        action: 'maintainPlan',
        label: 'Maintenir le plan',
        explanation: 'Le plan reste cohérent.',
      },
      nextReview: { type: 'date', date: '2026-09-04' },
      lastReview: { weekEnd: '2026-08-16' },
    });
    expect(snapshot.monitoredPoints).toEqual(['La récupération reste stable.']);
  });

  it('n’expose jamais un verdict sans check-in, même si un résultat est fourni', () => {
    const snapshot = buildCoachHubSnapshot({
      referenceDate: '2026-08-28',
      profile: createEntity(createProfileInput()),
      hasCheckIn: false,
      dailyCoachResult: dailyResult,
      plannedSessions: [],
      reviews: [],
    });

    expect(snapshot.dailyVerdict).toEqual({ status: 'checkInRequired' });
    expect(snapshot.lastReview).toBeUndefined();
    expect(snapshot.coachPhase).toEqual({ status: 'unavailable' });
  });
});
