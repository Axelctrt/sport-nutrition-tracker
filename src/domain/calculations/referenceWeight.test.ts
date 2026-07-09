import { describe, expect, it } from 'vitest';
import {
  getPreviousCalendarWeekRange,
  resolveReferenceWeight,
  selectDailyReferenceWeights,
} from '@/domain/calculations/referenceWeight';
import type { WeightEntry } from '@/domain/models/weight';

function entry(
  date: string,
  weightKg: number,
  updatedAt = `${date}T08:00:00.000Z`,
  id = `weight:${date}:${updatedAt}`,
): WeightEntry {
  return {
    id,
    date,
    weightKg,
    createdAt: updatedAt,
    updatedAt,
  };
}

describe('poids de référence hebdomadaire', () => {
  it('retient la semaine civile précédente du lundi au dimanche', () => {
    expect(getPreviousCalendarWeekRange('2026-07-09')).toEqual({
      start: '2026-06-29',
      end: '2026-07-05',
    });
  });

  it('gère correctement un changement d’année', () => {
    expect(getPreviousCalendarWeekRange('2026-01-01')).toEqual({
      start: '2025-12-22',
      end: '2025-12-28',
    });
  });

  it('utilise la dernière valeur de chaque journée avant de calculer la moyenne', () => {
    const values = [
      entry('2026-06-29', 60.4, '2026-06-29T07:00:00.000Z', 'old'),
      entry('2026-06-29', 60.1, '2026-06-29T19:00:00.000Z', 'new'),
      entry('2026-07-01', 59.9),
      entry('2026-07-05', 60),
      entry('2026-07-06', 70),
    ];

    const result = resolveReferenceWeight('2026-07-09', 65, values);

    expect(result.source).toBe('previousWeekAverage');
    expect(result.weightKg).toBeCloseTo(60, 10);
    expect(result.dailyWeights.map(({ date, weightKg }) => ({ date, weightKg }))).toEqual([
      { date: '2026-06-29', weightKg: 60.1 },
      { date: '2026-07-01', weightKg: 59.9 },
      { date: '2026-07-05', weightKg: 60 },
    ]);
  });

  it('considère une seule pesée comme une moyenne valide', () => {
    expect(resolveReferenceWeight(
      '2026-07-09',
      65,
      [entry('2026-07-02', 61.2)],
    )).toMatchObject({
      source: 'previousWeekAverage',
      weightKg: 61.2,
    });
  });

  it('revient au poids du profil sans valeur valide pendant la semaine précédente', () => {
    expect(resolveReferenceWeight(
      '2026-07-09',
      64.5,
      [entry('2026-06-28', 60), entry('2026-07-06', 61)],
    )).toEqual({
      source: 'profile',
      weightKg: 64.5,
      period: { start: '2026-06-29', end: '2026-07-05' },
      dailyWeights: [],
    });
  });

  it('ignore les valeurs invalides ou situées hors période', () => {
    const invalid = entry('2026-07-03', Number.NaN);
    const selected = selectDailyReferenceWeights(
      [entry('2026-06-28', 70), invalid, entry('2026-07-04', 62)],
      { start: '2026-06-29', end: '2026-07-05' },
    );

    expect(selected).toHaveLength(1);
    expect(selected[0]?.weightKg).toBe(62);
  });
});
