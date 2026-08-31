import { describe, expect, it } from 'vitest';
import { resolveCoachSafety } from '@/domain/coach/coachSafety';
import type { StrengthPerformanceTrend } from '@/domain/coach/strengthPerformance';

function input(
  overrides: Partial<Parameters<typeof resolveCoachSafety>[0]> = {},
): Parameters<typeof resolveCoachSafety>[0] {
  return {
    referenceDate: '2026-08-30' as const,
    coachState: 'onTrack' as const,
    strengthPerformance: { exercises: [] },
    contextFlags: [],
    ageYears: 30,
    ...overrides,
  };
}

function performance(trend: StrengthPerformanceTrend) {
  return {
    exercises: [{
      exerciseDefinitionId: 'squat',
      exerciseName: 'Squat',
      trackingMode: 'loadRepetitions' as const,
      exposureCount: 3,
      comparableExposureCount: 3,
      trend,
      reasons: [],
      exposures: [],
    }],
  };
}

describe('resolveCoachSafety', () => {
  it('reste clear sans préoccupation confirmée et n’interprète pas les données absentes', () => {
    const missingAge = input();
    delete missingAge.ageYears;
    expect(resolveCoachSafety(missingAge)).toEqual({
      referenceDate: '2026-08-30',
      status: 'clear',
      concerns: [],
      reasons: [],
      blockingFactors: [],
    });
  });

  it.each([
    ['excessiveLoss', performance('insufficientData'), 'bodyTrend'],
    ['degradedRecovery', performance('insufficientData'), 'recovery'],
    ['onTrack', performance('degrading'), 'performance'],
  ] satisfies Array<[
    Parameters<typeof resolveCoachSafety>[0]['coachState'],
    Parameters<typeof resolveCoachSafety>[0]['strengthPerformance'],
    'bodyTrend' | 'recovery' | 'performance',
  ]>)('classe un domaine longitudinal unique en caution', (
    coachState,
    strengthPerformance,
    domain,
  ) => {
    const result = resolveCoachSafety(input({ coachState, strengthPerformance }));
    expect(result.status).toBe('caution');
    expect(result.concerns.map((concern) => concern.domain)).toEqual([domain]);
    expect(result.blockingFactors).toEqual([]);
  });

  it('converge vers doNotIntensify avec deux domaines indépendants', () => {
    const result = resolveCoachSafety(input({
      coachState: 'degradedRecovery',
      strengthPerformance: performance('degrading'),
    }));
    expect(result.status).toBe('doNotIntensify');
    expect(result.concerns.map(({ domain }) => domain)).toEqual(['recovery', 'performance']);
  });

  it('conserve séparément le corps et la récupération sans nouveau seuil', () => {
    const result = resolveCoachSafety(input({
      coachState: 'degradedRecovery',
      bodyTrendIsExcessive: true,
    }));
    expect(result.status).toBe('doNotIntensify');
    expect(result.concerns.map(({ domain }) => domain)).toEqual(['bodyTrend', 'recovery']);
  });

  it.each([
    [['illness'], 'Une maladie est signalée'],
    [['painOrInjury'], 'Une douleur ou blessure est signalée'],
  ] as const)('applique immédiatement le veto aigu %j', (contextFlags, reason) => {
    const result = resolveCoachSafety(input({ contextFlags: [...contextFlags] }));
    expect(result.status).toBe('doNotIntensify');
    expect(result.concerns[0]).toMatchObject({ domain: 'acuteContext', immediateVeto: true });
    expect(result.reasons[0]).toContain(reason);
  });

  it('applique le veto d’éligibilité avant 18 ans sans diagnostic médical', () => {
    const result = resolveCoachSafety(input({ ageYears: 17 }));
    expect(result.status).toBe('doNotIntensify');
    expect(result.concerns[0]).toMatchObject({ domain: 'eligibility', immediateVeto: true });
    expect(result.reasons.join(' ')).not.toMatch(/diagnostic|maladie détectée/i);
  });
});
