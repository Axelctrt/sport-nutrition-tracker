import { describe, expect, it, vi } from 'vitest';
import {
  calculateIntegratedCoachDecision,
  type IntegratedCoachDecisionServiceDependencies,
} from '@/application/coach/integratedCoachDecisionService';
import type { CoachStateObservation } from '@/domain/coach/coachStateObservations';
import type { StrengthPerformanceSnapshot } from '@/domain/coach/strengthPerformance';
import type { UserProfile } from '@/domain/models/profile';
import { createCalorieAdaptationAssessment } from '@/test/factories/weeklyReviewFactory';

const profile = {
  id: 'profile-1',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  sexForEnergyEquation: 'male',
  ageInformation: { mode: 'age', ageYears: 30, recordedOn: '2026-08-01' },
  heightCm: 180,
  initialWeightKg: 80,
  goal: 'loss',
  targetWeeklyWeightChangePercent: -0.5,
  occupationalActivity: 'sedentary',
  dailyStepGoal: 9_000,
  proteinGramsPerKg: 1.8,
  fatGramsPerKg: 0.8,
} satisfies UserProfile;

const observation: CoachStateObservation = {
  date: '2026-08-25',
  weight: {
    value: 80,
    date: '2026-08-25',
    provenance: 'profileInitialization',
    confidence: 'fallback',
  },
  readiness: {
    value: 'low',
    date: '2026-08-25',
    provenance: 'legacyUnknown',
    confidence: 'unknown',
  },
  journalComplete: false,
  expectedSteps: { value: 9_000, source: 'profileFallback', confidence: 'fallback' },
  actualSteps: { value: 1_000, source: 'manual' },
  hasTemporaryContext: false,
  strengthSessionCount: 0,
};

const strengthSnapshot: StrengthPerformanceSnapshot = {
  referenceDate: '2026-08-25',
  exercises: [],
  schedule: {
    completedPlannedCount: 0,
    skippedCount: 0,
    overdueCount: 0,
    abandonedCount: 0,
  },
};

function dependencies(): IntegratedCoachDecisionServiceDependencies & Record<
  string,
  unknown
> {
  return {
    settings: {
      get: vi.fn(async () => ({
        maximumWeeklyAdjustmentKcal: 100,
        maximumCumulativeAdjustmentKcal: 600,
      })),
    },
    weight: { listBetween: vi.fn(async () => []) },
    food: {
      listEntriesBetween: vi.fn(async () => []),
      listJournalStatusesBetween: vi.fn(async () => []),
    },
    targets: { listTargetsBetween: vi.fn(async () => []) },
    steps: { listBetween: vi.fn(async () => []) },
    dailyCoaching: {
      listCheckInsBetween: vi.fn(async () => []),
      listCheckOutsBetween: vi.fn(async () => []),
    },
    activities: { listBetween: vi.fn(async () => []) },
    workoutSessions: {
      listAll: vi.fn(async () => [
        { date: '2026-08-25' },
        { date: '2026-08-26' },
      ]),
    },
    weeklyReviews: { listAdjustments: vi.fn(async () => []) },
    calculateStrength: vi.fn(async () => strengthSnapshot),
    buildObservations: vi.fn(() => [observation]),
    resolveState: vi.fn(() => ({
      state: 'insufficientData' as const,
      confidence: {
        weight: 0,
        food: 0,
        activity: 0,
        recovery: 0,
        overall: 0,
        level: 'insufficient' as const,
      },
      reasons: [],
      blockingFactors: [],
    })),
    resolveStateResult: vi.fn(({ analysis }) => ({
      ...analysis,
      priority: 'low' as const,
      recommendedAction: { type: 'collectMoreData' as const },
      nextReview: { type: 'condition' as const, condition: 'moreData' as const },
    })),
    calculateCalorieAssessment: vi.fn(() => createCalorieAdaptationAssessment({
      detectedState: 'insufficientData',
      proposedAdjustmentKcal: 0,
    })),
    resolveDecision: vi.fn((input) => ({
      referenceDate: input.referenceDate,
      primaryAction: 'collectMoreData' as const,
      priority: input.coachStateResult.priority,
      coachState: input.coachStateResult.state,
      strengthContext: 'insufficient' as const,
      reasons: [],
      blockingFactors: [],
      requiresUserAcceptance: false,
      nextReview: input.coachStateResult.nextReview,
    })),
  } as unknown as ReturnType<typeof dependencies>;
}

describe('calculateIntegratedCoachDecision', () => {
  it('compose C1, C3 et le moteur calorique avec une referenceDate unique', async () => {
    const deps = dependencies();
    const result = await calculateIntegratedCoachDecision({
      referenceDate: '2026-08-25',
      profile,
      referenceWeightKg: 80,
    }, deps);

    expect(result.primaryAction).toBe('collectMoreData');
    expect(deps.calculateStrength).toHaveBeenCalledWith('2026-08-25', undefined);
    expect(deps.buildObservations).toHaveBeenCalledWith(expect.objectContaining({
      analysisStart: '2026-08-05',
      analysisEnd: '2026-08-25',
      fallbackExpectedSteps: 9_000,
      workoutSessions: [{ date: '2026-08-25' }],
    }));
    expect(deps.resolveState).toHaveBeenCalledWith({
      observations: [observation],
      goal: 'loss',
      targetWeeklyWeightChangeKg: -0.4,
    });
    expect(deps.resolveStateResult).toHaveBeenCalledWith(expect.objectContaining({
      referenceDate: '2026-08-25',
    }));
    expect(deps.resolveDecision).toHaveBeenCalledWith(expect.objectContaining({
      referenceDate: '2026-08-25',
      strengthPerformance: strengthSnapshot,
    }));
  });

  it('projette les preuves C1 sans laundering avant le moteur calorique', async () => {
    const deps = dependencies();
    await calculateIntegratedCoachDecision({
      referenceDate: '2026-08-25',
      profile,
      referenceWeightKg: 80,
    }, deps);

    const calorieInput = vi.mocked(deps.calculateCalorieAssessment!).mock.calls[0]?.[0];
    expect(calorieInput?.observations).toEqual([expect.objectContaining({
      date: '2026-08-25',
      actualSteps: 1_000,
    })]);
    expect(calorieInput?.observations[0]).not.toHaveProperty('weightKg');
    expect(calorieInput?.observations[0]).not.toHaveProperty('readiness');
    expect(calorieInput?.observations[0]).not.toHaveProperty('expectedSteps');
  });

  it('n’expose et n’appelle que des lectures repository', async () => {
    const deps = dependencies();
    await calculateIntegratedCoachDecision({
      referenceDate: '2026-08-25',
      profile,
      referenceWeightKg: 80,
    }, deps);

    expect(Object.keys(deps.settings)).toEqual(['get']);
    expect(Object.keys(deps.weeklyReviews)).toEqual(['listAdjustments']);
    expect(Object.keys(deps).some((key) => (
      /accept|create|update|upsert|persist/i.test(key)
    ))).toBe(false);
    expect(Object.values(deps)
      .filter((value) => value && typeof value === 'object')
      .flatMap((value) => Object.keys(value as object))
      .some((key) => /accept|create|update|upsert|persist/i.test(key))).toBe(false);
  });

  it('refuse les entrées invalides avant toute lecture', async () => {
    const deps = dependencies();
    await expect(calculateIntegratedCoachDecision({
      referenceDate: '2026-08-40',
      profile,
      referenceWeightKg: 80,
    }, deps)).rejects.toThrow(/invalide/);
    expect(deps.settings.get).not.toHaveBeenCalled();
    expect(deps.calculateStrength).not.toHaveBeenCalled();
  });
});
