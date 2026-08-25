import { describe, expect, it, vi } from 'vitest';
import {
  calculateDailyCoach,
  getDailyCoachAnalysisPeriod,
  type DailyCoachServiceDependencies,
} from '@/application/coach/dailyCoachService';
import type { CoachStateObservation } from '@/domain/coach/coachStateObservations';
import type { UserProfile } from '@/domain/models/profile';
import type { DailyCheckIn } from '@/domain/models/dailyCoaching';
import type { WeightEntry } from '@/domain/models/weight';
import { CALORIE_ADAPTATION_WINDOW_DAYS } from '@/domain/reviews/calorieAdaptationAssessment';

const profile = {
  id: 'profile-1',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  sexForEnergyEquation: 'male',
  ageInformation: { mode: 'age', ageYears: 30, recordedOn: '2026-08-01' },
  heightCm: 180,
  initialWeightKg: 90,
  goal: 'loss',
  targetWeeklyWeightChangePercent: -0.5,
  occupationalActivity: 'sedentary',
  dailyStepGoal: 9_000,
  proteinGramsPerKg: 1.8,
  fatGramsPerKg: 0.8,
} satisfies UserProfile;

const observation: CoachStateObservation = {
  date: '2026-08-25',
  journalComplete: false,
  expectedSteps: { value: 9_000, source: 'profileFallback', confidence: 'fallback' },
  hasTemporaryContext: false,
  strengthSessionCount: 0,
};

function dependencies(): DailyCoachServiceDependencies & {
  buildObservations: ReturnType<typeof vi.fn>;
  resolveState: ReturnType<typeof vi.fn>;
  resolveStateResult: ReturnType<typeof vi.fn>;
  project: ReturnType<typeof vi.fn>;
} {
  const confidence = {
    weight: 80,
    food: 80,
    activity: 80,
    recovery: 80,
    overall: 80,
    level: 'reliable' as const,
  };
  const buildObservations = vi.fn(() => [observation]);
  const resolveState = vi.fn(() => ({
    state: 'onTrack' as const,
    confidence,
    reasons: [],
    blockingFactors: [],
  }));
  const resolveStateResult = vi.fn(({ analysis }) => ({
    ...analysis,
    priority: 'low' as const,
    recommendedAction: { type: 'maintainPlan' as const },
    nextReview: { type: 'condition' as const, condition: 'moreData' as const },
  }));
  const project = vi.fn(({ coachStateResult }) => ({
    verdict: 'planMaintained' as const,
    title: 'Plan maintenu',
    message: 'Aucun changement.',
    priority: coachStateResult.priority,
    coachState: coachStateResult.state,
    confidence: coachStateResult.confidence,
  }));
  return {
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
      listAll: vi.fn(async () => [{ date: '2026-07-01' }, { date: '2026-08-25' }]),
    },
    buildObservations,
    resolveState,
    resolveStateResult,
    project,
  } as unknown as ReturnType<typeof dependencies>;
}

describe('calculateDailyCoach', () => {
  it('réutilise exactement la fenêtre C1 pour tous les historiques', async () => {
    const deps = dependencies();
    const period = getDailyCoachAnalysisPeriod('2026-08-25');
    expect(CALORIE_ADAPTATION_WINDOW_DAYS).toBe(21);

    await calculateDailyCoach({ date: '2026-08-25', profile, referenceWeightKg: 80 }, deps);

    expect(period).toEqual({ analysisStart: '2026-08-05', analysisEnd: '2026-08-25' });
    expect(deps.weight.listBetween).toHaveBeenCalledWith(period.analysisStart, period.analysisEnd);
    expect(deps.food.listEntriesBetween).toHaveBeenCalledWith(period.analysisStart, period.analysisEnd);
    expect(deps.food.listJournalStatusesBetween).toHaveBeenCalledWith(period.analysisStart, period.analysisEnd);
    expect(deps.targets.listTargetsBetween).toHaveBeenCalledWith(period.analysisStart, period.analysisEnd);
    expect(deps.steps.listBetween).toHaveBeenCalledWith(period.analysisStart, period.analysisEnd);
    expect(deps.dailyCoaching.listCheckInsBetween).toHaveBeenCalledWith(period.analysisStart, period.analysisEnd);
    expect(deps.dailyCoaching.listCheckOutsBetween).toHaveBeenCalledWith(period.analysisStart, period.analysisEnd);
    expect(deps.activities.listBetween).toHaveBeenCalledWith(period.analysisStart, period.analysisEnd);
  });

  it('compose le pipeline C1, le fallback pas et le poids de référence fourni', async () => {
    const deps = dependencies();
    await calculateDailyCoach({ date: '2026-08-25', profile, referenceWeightKg: 80 }, deps);

    expect(deps.buildObservations).toHaveBeenCalledOnce();
    expect(deps.buildObservations.mock.calls[0]?.[0]).toMatchObject({
      analysisStart: '2026-08-05',
      analysisEnd: '2026-08-25',
      fallbackExpectedSteps: 9_000,
      workoutSessions: [{ date: '2026-08-25' }],
    });
    expect(deps.resolveState).toHaveBeenCalledWith({
      observations: [observation],
      goal: 'loss',
      targetWeeklyWeightChangeKg: -0.4,
    });
    expect(deps.resolveStateResult).toHaveBeenCalledWith(expect.objectContaining({
      referenceDate: '2026-08-25',
    }));
    expect(deps.project).toHaveBeenCalledWith(expect.objectContaining({
      todayObservation: observation,
    }));
  });

  it('reste déterministe et n’expose aucune dépendance de persistance Coach ou Weekly Review', async () => {
    const deps = dependencies();
    const input = { date: '2026-08-25' as const, profile, referenceWeightKg: 80 };

    await expect(calculateDailyCoach(input, deps)).resolves.toStrictEqual(
      await calculateDailyCoach(input, deps),
    );
    expect(Object.keys(deps)).not.toContain('weeklyReviews');
    expect(Object.keys(deps.dailyCoaching).every((key) => key.startsWith('list'))).toBe(true);
  });

  it('laisse le pipeline C1 qualifier les poids fallback et les subjectifs legacy', async () => {
    const deps = dependencies();
    const { buildObservations: _injectedBuilder, ...realPipelineDeps } = deps;
    vi.mocked(realPipelineDeps.weight.listBetween).mockResolvedValue([{
      id: 'weight-profile',
      date: '2026-08-25',
      weightKg: 80,
      provenance: 'profileInitialization',
      createdAt: '2026-08-25T06:00:00.000Z',
      updatedAt: '2026-08-25T06:00:00.000Z',
    } satisfies WeightEntry]);
    vi.mocked(realPipelineDeps.dailyCoaching.listCheckInsBetween).mockResolvedValue([{
      id: 'legacy-check-in',
      date: '2026-08-25',
      readiness: 'low',
      contextFlags: [],
      contextSyncPreference: 'localOnly',
      completedAt: '2026-08-25T07:00:00.000Z',
      createdAt: '2026-08-25T07:00:00.000Z',
      updatedAt: '2026-08-25T07:00:00.000Z',
    } satisfies DailyCheckIn]);

    await calculateDailyCoach(
      { date: '2026-08-25', profile, referenceWeightKg: 80 },
      realPipelineDeps,
    );

    const c1Observations = deps.resolveState.mock.calls[0]?.[0].observations;
    expect(c1Observations?.at(-1)?.weight).toMatchObject({
      provenance: 'profileInitialization',
      confidence: 'fallback',
    });
    expect(c1Observations?.at(-1)?.readiness).toMatchObject({
      provenance: 'legacyUnknown',
      confidence: 'unknown',
    });
  });
});
