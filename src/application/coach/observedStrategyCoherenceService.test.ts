import { afterEach, describe, expect, it, vi } from 'vitest';
import { assembleObservedStrategyCoherence } from '@/application/coach/observedStrategyCoherenceService';
import {
  appendStrategyProposal, createLegacyCoachStrategyState, emptyCoachStrategyState, respondToStrategyProposal,
} from '@/domain/coach/coachStrategyState';
import { OBSERVED_STRATEGY_RULES } from '@/domain/coach/observedStrategyCoherence';
import type { CoachStrategyKind } from '@/domain/coach/coachStrategy';
import { createDefaultDeviceSettings, createDefaultUserSettings } from '@/domain/defaults/appSettings';
import { LOCAL_USER_PROFILE_ID } from '@/domain/defaults/identifiers';
import type { CoachStrategySources } from '@/infrastructure/repositories/contracts/CoachStrategyRepository';
import type { WeightGoal } from '@/domain/models/profile';
import type { StrengthTrackingMode } from '@/domain/models/strength';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';
import { createExerciseDefinitionInput, createStrengthSetInput, createWorkoutSessionExerciseInput,
  createWorkoutSessionInput } from '@/test/factories/strengthFactory';

const { forbiddenIO } = vi.hoisted(() => ({ forbiddenIO: vi.fn(() => { throw new Error('Resolver must not use repositories'); }) }));
vi.mock('@/infrastructure/repositories/repositories', () => ({
  repositories: new Proxy({}, { get: () => new Proxy({}, { get: () => forbiddenIO }) }),
}));
const date = '2026-06-21';
const timestamp = `${date}T18:00:00.000Z`;
const day = (index: number) => `2026-06-${String(index + 1).padStart(2, '0')}`;
const strategyFor = (goal: WeightGoal): CoachStrategyKind => ({ loss: 'activeDeficit', maintenance: 'stabilization', gain: 'activeConstruction' } as const)[goal];

function accepted(goal: WeightGoal) {
  const proposal = { id: 'proposal', version: 1 as const, objective: goal, strategy: strategyFor(goal), status: 'pending' as const,
    reasons: ['Explicit acceptance fixture'], context: { origin: 'c4c5' as const, referenceDate: date,
      referenceWeightKg: 70, sourceFingerprint: 'a'.repeat(64), primaryAction: 'maintainPlan' as const, safetyStatus: 'clear' as const } };
  return respondToStrategyProposal(appendStrategyProposal(emptyCoachStrategyState(), proposal), {
    id: 'acceptance', proposalId: 'proposal', proposalVersion: 1, response: 'accepted', decidedAt: timestamp,
  });
}

function sources(goal: WeightGoal = 'maintenance', trend = goal === 'loss' ? -0.35 : goal === 'gain' ? 0.175 : 0): CoachStrategySources {
  return {
    userProfile: [createEntity(createProfileInput({ goal, dailyStepGoal: 8_000,
      targetWeeklyWeightChangePercent: goal === 'loss' ? -0.5 : goal === 'gain' ? 0.25 : 0 }), LOCAL_USER_PROFILE_ID, timestamp)],
    userSettings: [createDefaultUserSettings()], deviceSettings: [createDefaultDeviceSettings()],
    weights: Array.from({ length: 11 }, (_, i) => createEntity({ date: day(i * 2), weightKg: 70 + trend * i * 2 / 7,
      provenance: 'userMeasurement' as const }, `weight-${i}`, timestamp)),
    foodEntries: Array.from({ length: 21 }, (_, i) => createEntity({ date: day(i), mealId: 'meal', mealSlot: 'lunch' as const,
      sourceType: 'product' as const, reference: { sourceType: 'product' as const, productId: 'food', inputMode: 'amount' as const,
        inputQuantity: 100, normalizedAmount: 100, normalizedUnit: 'g' as const,
        nutritionPer100Snapshot: { caloriesKcal: 2_000, proteinGrams: 140, carbohydratesGrams: 220, fatGrams: 62 } } }, `food-${i}`, timestamp)),
    dailyJournalStatuses: Array.from({ length: 21 }, (_, i) => createEntity({ date: day(i), isComplete: true }, `journal-${i}`, timestamp)),
    dailyTargets: Array.from({ length: 21 }, (_, i) => createEntity({ date: day(i), calculationWeightKg: 70,
      energy: { bmrKcal: 1_500, occupationalBaseKcal: 300, walkingKcal: 200, runningKcal: 0, swimmingKcal: 0,
        strengthTrainingKcal: 0, otherActivitiesKcal: 0, totalEstimatedExpenditureKcal: 2_000 },
      goalAdjustmentKcal: 0, acceptedCalibrationAdjustmentKcal: 0, calorieFloorKcal: 1_500, targetCaloriesKcal: 2_000,
      macros: { proteinGrams: 140, carbohydratesGrams: 220, fatGrams: 62 }, calculationVersion: 1,
      stepBasis: { mode: 'expected' as const, steps: 8_000, stepGoal: 8_000, source: 'recentHistory' as const,
        confidence: 'established' as const, observedDayCount: 14, observationWindowDays: 14 } }, `target-${i}`, timestamp)),
    dailySteps: Array.from({ length: 21 }, (_, i) => createEntity({ date: day(i), totalSteps: 8_000, source: 'manual' as const }, `steps-${i}`, timestamp)),
    dailyCheckIns: [], dailyCheckOuts: [], activities: [], workoutSessions: [], workoutSessionExercises: [],
    strengthSets: [], exerciseDefinitions: [], acceptedCalorieAdjustments: [],
  };
}

function strength(rows: CoachStrategySources, reps: number[], exerciseId = 'exercise', mode: StrengthTrackingMode = 'loadRepetitions') {
  rows.exerciseDefinitions.push(createEntity(createExerciseDefinitionInput(), exerciseId, timestamp));
  reps.forEach((repetitions, i) => {
    // Deliberately old: the Strategy layer must not choose its own freshness limit.
    const sessionDate = `2020-01-0${i + 1}`;
    const id = `${exerciseId}-${i}`;
    rows.workoutSessions.push(createEntity(createWorkoutSessionInput({ date: sessionDate,
      startedAt: `${sessionDate}T17:00:00.000Z`, completedAt: `${sessionDate}T18:00:00.000Z` }), id, timestamp));
    rows.workoutSessionExercises.push(createEntity(createWorkoutSessionExerciseInput({ sessionId: id,
      exerciseDefinitionId: exerciseId, plannedSets: 1, trackingModeSnapshot: mode }), `${id}-exercise`, timestamp));
    rows.strengthSets.push(createEntity(createStrengthSetInput({ sessionId: id, sessionExerciseId: `${id}-exercise`,
      repetitions, completedAt: `${sessionDate}T17:15:00.000Z` }), `${id}-set`, timestamp));
  });
}
const run = (rows: CoachStrategySources, strategyState: unknown = accepted(rows.userProfile[0]?.goal ?? 'maintenance')) =>
  assembleObservedStrategyCoherence({ referenceDate: date, referenceWeightKg: 70, sources: rows, strategyState });

afterEach(() => { expect(forbiddenIO).not.toHaveBeenCalled(); vi.clearAllMocks(); });

describe('observed Strategy assembly with real C1/C3/C4/C8 engines', () => {
  it.each(['loss', 'maintenance', 'gain'] as const)('maps accepted %s and limits compatible to observed body/nutrition', async (goal) => {
    const result = await run(sources(goal));
    expect(result.status).toBe('compatible');
    expect(result.rule).toEqual({ id: OBSERVED_STRATEGY_RULES[strategyFor(goal)].id, version: 1 });
    expect(result.c4Decision?.primaryAction).toBe('maintainPlan');
    expect(result.evaluatedDomains).toEqual(['bodyTrend', 'nutrition']);
    expect(result.nonEvaluableDomains).toContainEqual({ domain: 'recovery', reason: 'noQualifiedConclusionForDomain' });
    expect(result.evidence.filter(({ domain }) => domain === 'recovery')).toEqual([]);
    expect(result.attribution).toBe('notAssessed');
  });

  it('keeps legacy distinct, rejects corrupt state and blocks divergent profile', async () => {
    expect((await run(sources(), createLegacyCoachStrategyState('maintenance', 'migration'))).status).toBe('insufficientData');
    expect((await run(sources(), { ...accepted('maintenance'), revision: 999 })).status).toBe('blocked');
    expect((await run(sources('gain'), accepted('loss'))).status).toBe('blocked');
  });

  it('does not infer favorable signals from missing sources or synthetic subjective defaults', async () => {
    const rows = sources();
    rows.weights = [];
    rows.dailyCheckIns = [createEntity({ date, sleepQuality: 'good' as const, readiness: 'normal' as const,
      contextFlags: [], contextSyncPreference: 'localOnly' as const, completedAt: timestamp }, 'checkin', timestamp)];
    const result = await run(rows);
    expect(result.status).toBe('insufficientData');
    expect(result.evidence.some(({ domain }) => domain === 'recovery')).toBe(false);
    expect(result.safety).toMatchObject({ origin: 'integratedC8', assessment: { status: 'clear' } });
  });

  it('excludes future raw sources rather than using them as current observations', async () => {
    const rows = sources();
    const expected = await run(rows);
    rows.weights.push({ ...rows.weights[0]!, id: 'future', date: '2026-06-22', weightKg: 100 });
    rows.dailyCheckIns.push(createEntity({ date: '2026-06-22', contextFlags: ['painOrInjury' as const],
      contextSyncPreference: 'localOnly' as const, completedAt: timestamp }, 'future-checkin', timestamp));
    expect(await run(rows)).toEqual(expected);
  });

  it.each([['loss', -1.4], ['gain', 1.4], ['maintenance', 1.4]] as const)('reuses qualified C4 review for excessive/drifting %s', async (goal, trend) => {
    const result = await run(sources(goal, trend));
    expect(result.status).toBe('reviewRecommended');
    expect(result.reviewDomains).toContain('bodyTrend');
    expect(result.c4Decision?.primaryAction).toBe('reviewNutritionTarget');
    expect(result.c4Decision).not.toHaveProperty('proposedNutritionAdjustmentKcal');
  });

  it('retains low-activity C4 review for a plateau and does not select another Strategy', async () => {
    const rows = sources('loss', 0);
    rows.dailySteps.forEach((row) => { row.totalSteps = 1_000; });
    const result = await run(rows);
    expect(result.c4Decision?.primaryAction).toBe('reviewActivity');
    expect(result.status).toBe('reviewRecommended');
    expect(result.reviewDomains).toEqual(['activity']);
    expect(result.strategy).toMatchObject({ strategy: 'activeDeficit' });
  });

  it('plateau with progression is not evidence of optimal deficit or recomposition', async () => {
    const rows = sources('loss', 0);
    strength(rows, [8, 10]);
    const result = await run(rows);
    expect(result.c4Decision).toMatchObject({ primaryAction: 'maintainPlan', strengthContext: 'progressing' });
    expect(result.status).toBe('insufficientData');
    expect(result.evaluatedDomains).not.toContain('performance');
  });

  it.each([{ reps: [8, 10], trend: 'progressing' }, { reps: [10, 10, 10], trend: 'stagnating' }])('keeps old $trend dated, not favorable current performance', async ({ reps, trend }) => {
    const rows = sources('gain');
    strength(rows, reps);
    const result = await run(rows);
    expect(result.status).toBe('compatible');
    expect(result.reviewDomains).not.toContain('performance');
    expect(result.evaluatedDomains).not.toContain('performance');
    const evidence = result.evidence.find(({ origin }) => origin === 'c3')!;
    expect(evidence.freshness).toBe('notContracted');
    expect(evidence.interpretation).toBe('contextOnly');
    expect(evidence.reasons).toContain(`trend:${trend}`);
    expect(evidence.sourceReferences.every(({ date: sourceDate }) => sourceDate < result.sourcePeriod!.start)).toBe(true);
    expect(result.unknowns).toContain('performance:currentPerformanceFreshnessNotContracted');
  });

  it.each([false, true])('restates dated degrading/mixed C4/C8 review without inventing current freshness (mixed=%s)', async (mixed) => {
    const rows = sources('gain');
    strength(rows, [12, 10, 8]);
    if (mixed) strength(rows, [8, 10], 'other');
    const result = await run(rows);
    expect(result.status).toBe('reviewRecommended');
    expect(result.reviewDomains).toEqual(['performance']);
    expect(result.c4Decision?.strengthContext).toBe(mixed ? 'mixed' : 'degrading');
    expect(result.evaluatedDomains).not.toContain('performance');
    expect(result.safety).toMatchObject({ scope: 'c8CalorieDecreaseOnly', assessment: { status: 'caution' } });
    if (mixed) expect(result.contradictions).toContain('existingMixedStrengthSignals');
    const c3 = result.evidence.find(({ origin }) => origin === 'c3')!;
    const c8 = result.evidence.find(({ origin, domain }) => origin === 'c8' && domain === 'performance')!;
    expect(c8.sourceReferences).toEqual(expect.arrayContaining(c3.sourceReferences));
  });

  it('preserves dated bodyweight dependencies and never upgrades an old weight to current body evidence', async () => {
    const rows = sources('gain');
    rows.weights = [createEntity({ date: '2019-01-01', weightKg: 70, provenance: 'userMeasurement' as const }, 'old-weight', timestamp)];
    strength(rows, [8, 10], 'pullup', 'bodyweightRepetitions');
    const result = await run(rows);
    expect(result.status).toBe('insufficientData');
    expect(result.evaluatedDomains).not.toContain('bodyTrend');
    const c3 = result.evidence.find(({ origin }) => origin === 'c3')!;
    expect(c3.dependentSourceReferences).toEqual([{ collection: 'weights', id: 'old-weight', date: '2019-01-01',
      provenance: 'userMeasurement', fields: ['weightKg'] }]);
    expect(c3.reasons).toContain('trend:progressing');
  });

  it('notComparable bodyweight exposure stays insufficient, not negative or positive performance', async () => {
    const rows = sources('gain');
    strength(rows, [8, 10], 'pullup', 'bodyweightRepetitions');
    const result = await run(rows);
    expect(result.c4Decision?.strengthContext).toBe('insufficient');
    expect(result.reviewDomains).not.toContain('performance');
    expect(result.evidence.find(({ origin }) => origin === 'c3')?.reasons).toContain('trend:insufficientData');
  });

  it('groups four recovery signals and correlated body/C1/C4/C8 sources without votes', async () => {
    const rows = sources('loss', -1.4);
    rows.dailyCheckIns = Array.from({ length: 21 }, (_, i) => createEntity({ date: day(i), sleepQuality: 'poor' as const,
      readiness: 'low' as const, signalProvenance: { sleepQuality: 'userReported' as const, readiness: 'userReported' as const },
      contextFlags: [], contextSyncPreference: 'localOnly' as const, completedAt: timestamp }, `in-${i}`, timestamp));
    rows.dailyCheckOuts = Array.from({ length: 21 }, (_, i) => createEntity({ date: day(i), hunger: 'high' as const,
      energy: 'low' as const, signalProvenance: { hunger: 'userReported' as const, energy: 'userReported' as const },
      foodJournalComplete: true, contextFlags: [], contextSyncPreference: 'localOnly' as const, completedAt: timestamp }, `out-${i}`, timestamp));
    const result = await run(rows);
    expect(result.status).toBe('reviewRecommended');
    expect(result.reviewDomains).toEqual(['bodyTrend', 'recovery']);
    expect(result.safety).toMatchObject({ assessment: { status: 'doNotIntensify' } });
    expect(new Set(result.evaluatedDomains).size).toBe(result.evaluatedDomains.length);
    const body = result.evidence.find(({ domain, origin }) => domain === 'bodyTrend' && origin === 'c1c4')!;
    expect(result.evidence.find(({ domain, origin }) => domain === 'bodyTrend' && origin === 'c8')?.sourceReferences).toEqual(body.sourceReferences);
    expect(result).not.toHaveProperty('score');
  });

  it('retains an immediate acute veto with missing settings and no longitudinal interpretation', async () => {
    const rows = sources();
    rows.userSettings = []; rows.weights = [];
    rows.dailyCheckIns = [createEntity({ date, contextFlags: ['painOrInjury' as const],
      contextSyncPreference: 'localOnly' as const, completedAt: timestamp }, 'acute', timestamp)];
    const result = await run(rows);
    expect(result).toMatchObject({ status: 'reviewRecommended', reviewDomains: ['acuteContext'],
      safety: { origin: 'immediateC8', scope: 'c8CalorieDecreaseOnly', assessment: { status: 'doNotIntensify' } } });
    expect(result.c4Decision).toBeUndefined();
    expect(result.evidence[0]?.sourceReferences[0]?.id).toBe('acute');
  });

  it('is read-only on frozen inputs and never invokes any repository, command, phase, memory or plan write', async () => {
    const rows = sources(); const state = accepted('maintenance');
    const before = JSON.stringify({ rows, state });
    const freeze = (value: unknown): void => {
      if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    };
    freeze(rows); freeze(state);
    const first = await run(rows, state);
    expect(await run(rows, state)).toEqual(first);
    expect(JSON.stringify({ rows, state })).toBe(before);
    expect(forbiddenIO).not.toHaveBeenCalled();
    expect(first.c4Decision).not.toHaveProperty('proposedNutritionAdjustmentKcal');
    expect(first).not.toHaveProperty('proposal');
    expect(first).not.toHaveProperty('phase');
    expect(first).not.toHaveProperty('memory');
  });
});
