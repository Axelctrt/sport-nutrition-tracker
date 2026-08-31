import { describe, expect, it, vi } from 'vitest';
import { loadCoachHub, type CoachHubServiceDependencies } from '@/application/coach/coachHubService';
import type { IntegratedCoachAnalysis } from '@/application/coach/integratedCoachDecisionService';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';
import { createWorkoutSessionInput } from '@/test/factories/strengthFactory';
import { createCalorieAdaptationAssessment, createWeeklyReview } from '@/test/factories/weeklyReviewFactory';
import { createCoachSafetyAssessment } from '@/test/factories/coachSafetyFactory';

function integratedAnalysis(): IntegratedCoachAnalysis {
  const nextReview = { type: 'condition' as const, condition: 'moreData' as const };
  return {
    coachStateResult: {
      state: 'insufficientData',
      confidence: {
        weight: 20,
        food: 20,
        activity: 20,
        recovery: 20,
        overall: 20,
        level: 'insufficient',
      },
      reasons: ['Complète les données avant une décision.'],
      blockingFactors: ['Données encore insuffisantes.'],
      priority: 'low',
      recommendedAction: { type: 'collectMoreData' },
      nextReview,
    },
    strengthPerformance: {
      referenceDate: '2026-08-28',
      exercises: [],
      schedule: {
        completedPlannedCount: 0,
        skippedCount: 0,
        overdueCount: 0,
        abandonedCount: 0,
      },
    },
    calorieAssessment: createCalorieAdaptationAssessment({
      detectedState: 'insufficientData',
      reasons: [],
      blockingFactors: [],
      proposedAdjustmentKcal: 0,
    }),
    safetyAssessment: createCoachSafetyAssessment({ referenceDate: '2026-08-28' }),
    decision: {
      referenceDate: '2026-08-28',
      primaryAction: 'collectMoreData',
      priority: 'low',
      coachState: 'insufficientData',
      strengthContext: 'insufficient',
      safetyAssessment: createCoachSafetyAssessment({ referenceDate: '2026-08-28' }),
      reasons: [],
      blockingFactors: [],
      requiresUserAcceptance: false,
      nextReview,
    },
  };
}

function dependencies(hasCheckIn = false): CoachHubServiceDependencies {
  return {
    targets: { getTargetByDate: vi.fn().mockResolvedValue(undefined) },
    dailyCoaching: {
      getCheckIn: vi.fn().mockResolvedValue(hasCheckIn ? { id: 'check-in' } : undefined),
    },
    weeklyReviews: { listAll: vi.fn().mockResolvedValue([createWeeklyReview()]) },
    workoutSessions: { listAll: vi.fn().mockResolvedValue([]) },
    activities: { listAll: vi.fn().mockResolvedValue([]) },
    readEndurancePlanningState: vi.fn(() => ({ version: 1 as const, sessions: [] })),
    calculateDaily: vi.fn().mockResolvedValue({
      verdict: 'planMaintained',
      title: 'Plan maintenu',
      message: 'Aucun changement.',
      priority: 'low',
      coachState: 'onTrack',
      confidence: integratedAnalysis().coachStateResult.confidence,
    }),
    calculateIntegratedAnalysis: vi.fn().mockResolvedValue(integratedAnalysis()),
  };
}

describe('loadCoachHub', () => {
  it('reste en lecture seule et ne calcule aucun verdict avant le check-in', async () => {
    const deps = dependencies(false);
    const profile = createEntity(createProfileInput({ goal: 'gain' }));
    const snapshot = await loadCoachHub('2026-08-28', profile, deps);

    expect(snapshot.dailyVerdict).toEqual({ status: 'checkInRequired' });
    expect(snapshot.coachPhase).toMatchObject({
      status: 'available',
      phase: { id: 'construction', objective: 'gain' },
    });
    expect(deps.calculateDaily).not.toHaveBeenCalled();
    expect(deps.targets.getTargetByDate).toHaveBeenCalledWith('2026-08-28');
    expect(deps.weeklyReviews.listAll).toHaveBeenCalledOnce();
    expect(Object.keys(deps.weeklyReviews)).toEqual(['listAll']);
    expect(Object.keys(deps.targets)).toEqual(['getTargetByDate']);
  });

  it('réutilise la décision C4 et la projection C5 sans créer de bilan', async () => {
    const deps = dependencies(true);
    const profile = createEntity(createProfileInput());
    const snapshot = await loadCoachHub('2026-08-28', profile, deps);

    expect(deps.calculateDaily).toHaveBeenCalledOnce();
    expect(deps.calculateIntegratedAnalysis).toHaveBeenCalledWith({
      referenceDate: '2026-08-28',
      profile,
      referenceWeightKg: profile.initialWeightKg,
    });
    expect(snapshot.priority).toMatchObject({
      action: 'collectMoreData',
      label: 'Compléter les données',
    });
    expect(snapshot.nextReview).toEqual({ type: 'condition', condition: 'moreData' });
    expect(snapshot.lastReview?.id).toBe('weekly-review');
    expect(snapshot.coachPhase).toMatchObject({
      status: 'available',
      phase: { id: 'stabilization', objective: 'maintenance' },
    });
  });

  it('agrège les prochaines séances de musculation et d’endurance existantes', async () => {
    const deps = dependencies(false);
    deps.workoutSessions.listAll = vi.fn().mockResolvedValue([
      createEntity(createWorkoutSessionInput({
        date: '2026-08-30',
        plannedDate: '2026-08-30',
        status: 'planned',
        sourceTemplateNameSnapshot: 'Full body',
      }), 'strength-session'),
    ]);
    deps.readEndurancePlanningState = vi.fn(() => ({
      version: 1 as const,
      sessions: [{
        id: 'endurance-session',
        title: 'Footing facile',
        activityType: 'running' as const,
        date: '2026-08-29',
        intensity: 'low' as const,
        status: 'planned' as const,
        createdAt: '2026-08-27T08:00:00.000Z',
        updatedAt: '2026-08-27T08:00:00.000Z',
      }],
    }));

    const snapshot = await loadCoachHub(
      '2026-08-28',
      createEntity(createProfileInput()),
      deps,
    );

    expect(snapshot.trainingPlan.nextSession).toMatchObject({
      id: 'endurance-session',
      source: 'endurance',
      title: 'Footing facile',
    });
    expect(snapshot.trainingPlan.plannedSessions.map(({ source }) => source))
      .toEqual(['endurance', 'strength']);
  });
});
