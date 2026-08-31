import { describe, expect, it } from 'vitest';
import { calculateCoachSafety } from '@/application/coach/coachSafetyService';
import type { CalculateCoachSafetyInput } from '@/application/coach/coachSafetyService';

function input(overrides: Partial<CalculateCoachSafetyInput> = {}): CalculateCoachSafetyInput {
  return {
    referenceDate: '2026-08-30',
    profile: {
      ageInformation: { mode: 'birthDate', birthDate: '2008-08-30' },
      goal: 'maintenance',
    },
    coachStateResult: { state: 'onTrack' },
    calorieAssessment: { detectedState: 'onTrack' },
    strengthPerformance: {
      referenceDate: '2026-08-30',
      exercises: [],
      schedule: {
        completedPlannedCount: 0,
        skippedCount: 0,
        overdueCount: 0,
        abandonedCount: 0,
      },
    },
    checkIns: [],
    checkOuts: [],
    ...overrides,
  };
}

describe('calculateCoachSafety', () => {
  it('utilise la date anniversaire exacte pour le passage de 17 à 18 ans', () => {
    expect(calculateCoachSafety(input({ referenceDate: '2026-08-29' })).status)
      .toBe('doNotIntensify');
    expect(calculateCoachSafety(input()).status).toBe('clear');
  });

  it('fait évoluer une saisie ageYears depuis recordedOn avec le calcul canonique', () => {
    const result = calculateCoachSafety(input({
      referenceDate: '2026-08-30',
      profile: {
        ageInformation: { mode: 'age', ageYears: 17, recordedOn: '2025-08-29' },
        goal: 'maintenance',
      },
    }));
    expect(result.status).toBe('clear');
  });

  it('préserve les domaines corps et récupération encodés par le contrat calorique existant', () => {
    const result = calculateCoachSafety(input({
      profile: {
        ageInformation: { mode: 'age', ageYears: 30, recordedOn: '2026-08-30' },
        goal: 'loss',
      },
      coachStateResult: { state: 'degradedRecovery' },
      calorieAssessment: { detectedState: 'degradedRecovery' },
    }));
    expect(result.status).toBe('doNotIntensify');
    expect(result.concerns.map(({ domain }) => domain)).toEqual(['bodyTrend', 'recovery']);
  });

  it('ne lit que le contexte du jour et ne mute aucune entrée', () => {
    const checkIns = Object.freeze([Object.freeze({
      id: 'daily-check-in:2026-08-30',
      date: '2026-08-30' as const,
      contextFlags: Object.freeze(['painOrInjury'] as const),
      contextSyncPreference: 'localOnly' as const,
      completedAt: '2026-08-30T08:00:00.000Z',
      createdAt: '2026-08-30T08:00:00.000Z',
      updatedAt: '2026-08-30T08:00:00.000Z',
    })]);
    const result = calculateCoachSafety(input({
      checkIns: checkIns as unknown as CalculateCoachSafetyInput['checkIns'],
    }));
    expect(result.status).toBe('doNotIntensify');
    expect(checkIns[0]?.contextFlags).toEqual(['painOrInjury']);
  });
});
