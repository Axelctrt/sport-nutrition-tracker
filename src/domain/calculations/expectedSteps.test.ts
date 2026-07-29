import { describe, expect, it } from 'vitest';
import { estimateExpectedSteps } from '@/domain/calculations/expectedSteps';
import type { DailySteps } from '@/domain/models/steps';

function steps(
  date: string,
  totalSteps: number,
  updatedAt = `${date}T22:00:00.000Z`,
): DailySteps {
  return {
    id: `steps:${date}`,
    date,
    totalSteps,
    source: 'manual',
    createdAt: updatedAt,
    updatedAt,
  };
}

function estimate(history: DailySteps[], stepGoal = 10_000) {
  return estimateExpectedSteps({
    date: '2026-07-29',
    occupationalActivity: 'sedentary',
    stepGoal,
    includedBaseSteps: 3_000,
    history,
  });
}

describe('estimateExpectedSteps', () => {
  it('utilise un repli profil prudent sans confondre estimation et objectif', () => {
    expect(estimate([], 12_000)).toEqual({
      expectedSteps: 5_000,
      stepGoal: 12_000,
      source: 'profileFallback',
      confidence: 'fallback',
      observedDayCount: 0,
      observationWindowDays: 28,
    });
  });

  it('apprend progressivement après sept jours observés', () => {
    const history = Array.from({ length: 7 }, (_, index) =>
      steps(`2026-07-${String(22 - index).padStart(2, '0')}`, 9_000),
    );

    expect(estimate(history)).toMatchObject({
      expectedSteps: 5_500,
      source: 'recentBlend',
      confidence: 'emerging',
      observedDayCount: 7,
    });
  });

  it('écarte une valeur aberrante quand l’historique est établi', () => {
    const regular = Array.from({ length: 14 }, (_, index) =>
      steps(`2026-07-${String(28 - index).padStart(2, '0')}`, 8_000 + (index % 3) * 100),
    );

    expect(estimate([...regular, steps('2026-07-01', 50_000)])).toMatchObject({
      expectedSteps: 8_100,
      source: 'recentHistory',
      confidence: 'established',
      observedDayCount: 15,
    });
  });

  it('ignore le jour calculé et les valeurs invalides', () => {
    const history = [
      steps('2026-07-29', 30_000),
      steps('2026-07-28', 8_000),
      steps('2026-07-27', 120_000),
    ];

    expect(estimate(history)).toMatchObject({
      expectedSteps: 5_000,
      observedDayCount: 1,
    });
  });

  it('ignore les observations antérieures à la fenêtre de 28 jours', () => {
    expect(estimate([
      steps('2026-07-28', 8_000),
      steps('2026-06-30', 20_000),
    ])).toMatchObject({
      expectedSteps: 5_000,
      observedDayCount: 1,
    });
  });
});
