import { describe, expect, it, vi } from 'vitest';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { WeeklyReview } from '@/domain/models/weeklyReview';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';
import {
  acceptCoachWeeklyReview,
  acceptWeeklyReview,
  loadWeeklyReview,
  rejectWeeklyReview,
  resolveCoachReferenceWeight,
  type WeeklyReviewServiceDependencies,
} from '@/application/weekly-review/weeklyReviewService';
import type { IntegratedCoachAnalysis } from '@/application/coach/integratedCoachDecisionService';
import {
  createEnergyArchitectureRetrospectiveReport,
} from '@/test/factories/energyArchitectureRetrospectiveFactory';
import {
  createCalorieAdaptationAssessment,
} from '@/test/factories/weeklyReviewFactory';
import { createCoachSafetyAssessment } from '@/test/factories/coachSafetyFactory';

function integratedAnalysis(
  action: IntegratedCoachAnalysis['decision']['primaryAction'] = 'collectMoreData',
  candidate = 0,
): IntegratedCoachAnalysis {
  const calorieAssessment = createCalorieAdaptationAssessment({
    detectedState: candidate === 0 ? 'insufficientData' : 'truePlateau',
    blockingFactors: candidate === 0 ? ['Données insuffisantes.'] : [],
    proposedAdjustmentKcal: candidate,
  });
  return {
    coachStateResult: {
      state: candidate === 0 ? 'insufficientData' : 'truePlateau',
      confidence: {
        weight: 80,
        food: 80,
        activity: 80,
        recovery: 80,
        overall: 80,
        level: candidate === 0 ? 'insufficient' : 'reliable',
      },
      reasons: ['Analyse Coach.'],
      blockingFactors: calorieAssessment.blockingFactors,
      priority: 'medium',
      recommendedAction: candidate === 0
        ? { type: 'collectMoreData' }
        : { type: 'reviewNutritionTarget', direction: candidate < 0 ? 'decrease' : 'increase' },
      nextReview: { type: 'date', date: '2026-06-21' },
    },
    strengthPerformance: {
      referenceDate: '2026-06-14',
      exercises: [],
      schedule: {
        completedPlannedCount: 0,
        skippedCount: 0,
        overdueCount: 0,
        abandonedCount: 0,
      },
    },
    calorieAssessment,
    safetyAssessment: createCoachSafetyAssessment({ referenceDate: '2026-06-14' }),
    decision: {
      referenceDate: '2026-06-14',
      primaryAction: action,
      priority: 'medium',
      coachState: candidate === 0 ? 'insufficientData' : 'truePlateau',
      strengthContext: 'insufficient',
      safetyAssessment: createCoachSafetyAssessment({ referenceDate: '2026-06-14' }),
      reasons: [],
      blockingFactors: calorieAssessment.blockingFactors,
      ...(candidate === 0 ? {} : { proposedNutritionAdjustmentKcal: candidate }),
      requiresUserAcceptance: action === 'reviewNutritionTarget' && candidate !== 0,
      nextReview: { type: 'date', date: '2026-06-21' },
    },
  };
}

function createDependencies(
  existing?: WeeklyReview,
  analysis: IntegratedCoachAnalysis = integratedAnalysis(),
): WeeklyReviewServiceDependencies {
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
    dailyCoaching: {
      listCheckInsBetween: vi.fn().mockResolvedValue([]),
      listCheckOutsBetween: vi.fn().mockResolvedValue([]),
    },
    loadEnergyRetrospective: vi.fn().mockResolvedValue(
      createEnergyArchitectureRetrospectiveReport(),
    ),
    calculateIntegratedAnalysis: vi.fn().mockResolvedValue(analysis),
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
    expect(result.review.adaptation).toMatchObject({
      analysisStart: '2026-05-25',
      analysisEnd: '2026-06-14',
      detectedState: 'insufficientData',
    });
    expect(dependencies.dailyCoaching.listCheckInsBetween)
      .toHaveBeenCalledWith('2026-05-25', '2026-06-14');
    expect(result.insights?.training.hasPlanning).toBe(false);
    expect(result.energyRetrospective?.status).toBe('insufficientData');
    expect(result.coachReview?.decision.primaryAction).toBe('collectMoreData');
    expect(dependencies.loadEnergyRetrospective).toHaveBeenCalledWith(
      '2026-06-14',
      profile,
    );
    expect(dependencies.weeklyReviews.upsert).toHaveBeenCalledOnce();
  });

  it('utilise l’assessment C4 qualifié et persiste exactement son candidat actif', async () => {
    const expectedAnalysis = integratedAnalysis('reviewNutritionTarget', -50);
    const dependencies = createDependencies(
      undefined,
      expectedAnalysis,
    );
    const result = await loadWeeklyReview('2026-06-10', profile, dependencies);

    expect(result.review.adaptation).toBe(expectedAnalysis.calorieAssessment);
    expect(result.review.proposedAdjustmentKcal).toBe(-50);
    expect(result.review.decisionStatus).toBe('pending');
    expect(dependencies.weeklyReviews.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ proposedAdjustmentKcal: -50 }),
    );
  });

  it('ne recalcule pas un bilan déjà accepté', async () => {
    const historical = { ...eligibleReview(), decisionStatus: 'accepted' as const };
    const dependencies = createDependencies(historical, integratedAnalysis('reviewNutritionTarget', -50));
    const result = await loadWeeklyReview('2026-06-10', profile, dependencies);
    expect(result.review).toStrictEqual(historical);
    expect(result.insights).toBeDefined();
    expect(result.energyRetrospective).toBeDefined();
    expect(dependencies.weeklyReviews.upsert).not.toHaveBeenCalled();
  });

  it('ne recalcule pas un bilan déjà refusé', async () => {
    const historical = { ...eligibleReview(), decisionStatus: 'rejected' as const };
    const dependencies = createDependencies(historical, integratedAnalysis('reviewNutritionTarget', -50));
    const result = await loadWeeklyReview('2026-06-10', profile, dependencies);

    expect(result.review).toStrictEqual(historical);
    expect(dependencies.weeklyReviews.upsert).not.toHaveBeenCalled();
  });

  it('conserve le bilan si le diagnostic énergétique est indisponible', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.loadEnergyRetrospective).mockRejectedValue(
      new Error('diagnostic unavailable'),
    );

    const result = await loadWeeklyReview('2026-06-10', profile, dependencies);

    expect(result.review.weekStart).toBe('2026-06-08');
    expect(result.energyRetrospective).toBeUndefined();
    expect(dependencies.weeklyReviews.upsert).toHaveBeenCalledOnce();
  });

  it('conserve les détails legacy mais désactive le Coach si C4 échoue', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.calculateIntegratedAnalysis).mockRejectedValue(
      new Error('coach unavailable'),
    );

    const result = await loadWeeklyReview('2026-06-10', profile, dependencies);

    expect(result.review.weekStart).toBe('2026-06-08');
    expect(result.review.adaptation).toBeDefined();
    expect(result.coachReview).toBeUndefined();
    expect(result.coachError).toMatch(/Bilan Coach indisponible/);
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

  it('préfère le dernier poids de calcul disponible sans en faire une mesure', () => {
    expect(resolveCoachReferenceWeight([
      { date: '2026-06-10', calculationWeightKg: 70 },
      { date: '2026-06-14', calculationWeightKg: 69.5 },
      { date: '2026-06-15', calculationWeightKg: 68 },
    ], '2026-06-14', 80)).toBe(69.5);
    expect(resolveCoachReferenceWeight([], '2026-06-14', 80)).toBe(80);
  });

  it('revalide puis réutilise acceptWeeklyReview pour un candidat matching', async () => {
    const dependencies = createDependencies(
      { ...eligibleReview(), proposedAdjustmentKcal: 100 },
      integratedAnalysis('reviewNutritionTarget', 100),
    );

    await acceptCoachWeeklyReview('2026-06-08', profile, dependencies);

    expect(dependencies.calculateIntegratedAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceDate: '2026-06-14',
        safetyReferenceDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        profile,
      }),
    );
    expect(dependencies.weeklyReviews.accept).toHaveBeenCalledOnce();
  });

  it.each([
    'maintainPlan',
    'reviewTraining',
    'reviewActivity',
    'prioritizeRecovery',
  ] as const)('refuse fail-closed l’action %s', async (action) => {
    const dependencies = createDependencies(
      eligibleReview(),
      integratedAnalysis(action, 100),
    );

    await expect(acceptCoachWeeklyReview('2026-06-08', profile, dependencies))
      .rejects.toThrow(/décision Coach a changé/);
    expect(dependencies.weeklyReviews.accept).not.toHaveBeenCalled();
  });

  it('refuse un recalcul stale qui change le candidat C4 par rapport au persisté', async () => {
    const dependencies = createDependencies(
      eligibleReview(),
      integratedAnalysis('reviewNutritionTarget', -50),
    );

    await expect(acceptCoachWeeklyReview('2026-06-08', profile, dependencies))
      .rejects.toThrow(/décision Coach a changé/);
    expect(dependencies.weeklyReviews.accept).not.toHaveBeenCalled();
  });

  it('recalcule Safety au clic et bloque fail-closed une baisse devenue interdite', async () => {
    const blocked = integratedAnalysis('maintainPlan', -50);
    const safetyAssessment = createCoachSafetyAssessment({
      referenceDate: '2026-06-14',
      status: 'doNotIntensify',
      concerns: [{
        domain: 'acuteContext',
        reasons: ['Une douleur ou blessure est signalée dans le check-in du jour.'],
        immediateVeto: true,
      }],
      reasons: ['Une douleur ou blessure est signalée dans le check-in du jour.'],
      blockingFactors: ['Une douleur ou blessure est signalée dans le check-in du jour.'],
    });
    blocked.safetyAssessment = safetyAssessment;
    blocked.decision = {
      ...blocked.decision,
      safetyAssessment,
      blockedAdjustment: { direction: 'decrease', reason: 'safety' },
      requiresUserAcceptance: false,
    };
    delete blocked.decision.proposedNutritionAdjustmentKcal;
    const dependencies = createDependencies(
      { ...eligibleReview(), proposedAdjustmentKcal: -50 },
      blocked,
    );

    await expect(acceptCoachWeeklyReview('2026-06-08', profile, dependencies))
      .rejects.toThrow(/décision Coach a changé/);
    expect(dependencies.calculateIntegratedAnalysis).toHaveBeenCalledOnce();
    expect(dependencies.weeklyReviews.accept).not.toHaveBeenCalled();
  });

  it('refuse un bilan qui n’est plus pending avant tout recalcul', async () => {
    const dependencies = createDependencies({
      ...eligibleReview(),
      decisionStatus: 'accepted',
    });

    await expect(acceptCoachWeeklyReview('2026-06-08', profile, dependencies))
      .rejects.toThrow(/bilan a changé/);
    expect(dependencies.calculateIntegratedAnalysis).not.toHaveBeenCalled();
    expect(dependencies.weeklyReviews.accept).not.toHaveBeenCalled();
  });

  it('refuse sans mutation lorsque C4 échoue à la revalidation', async () => {
    const dependencies = createDependencies(eligibleReview());
    vi.mocked(dependencies.calculateIntegratedAnalysis).mockRejectedValue(
      new Error('coach unavailable'),
    );

    await expect(acceptCoachWeeklyReview('2026-06-08', profile, dependencies))
      .rejects.toThrow(/ne peut pas être revalidé/);
    expect(dependencies.weeklyReviews.accept).not.toHaveBeenCalled();
  });
});
