import { describe, expect, it, vi } from 'vitest';
import {
  loadCurrentWeight,
  resolveCurrentWeight,
} from '@/application/weight/currentWeightService';
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

describe('currentWeightService', () => {
  it('utilise la dernière pesée selon sa date de mesure', () => {
    expect(resolveCurrentWeight(70, [
      entry('2026-07-10', 68.8),
      entry('2026-07-02', 69.4),
      entry('2026-07-08', 69),
    ])).toMatchObject({
      source: 'entry',
      weightKg: 68.8,
      measuredAt: '2026-07-10',
    });
  });

  it('ne remplace pas le poids actuel par une pesée antidatée', () => {
    const result = resolveCurrentWeight(70, [
      entry('2026-07-10', 68.8),
      entry('2026-06-15', 71.2, '2026-07-11T12:00:00.000Z'),
    ]);

    expect(result).toMatchObject({
      source: 'entry',
      weightKg: 68.8,
      measuredAt: '2026-07-10',
    });
  });

  it('retient la dernière modification lorsqu’une date est dupliquée', () => {
    const result = resolveCurrentWeight(70, [
      entry('2026-07-10', 69.1, '2026-07-10T08:00:00.000Z', 'old'),
      entry('2026-07-10', 68.9, '2026-07-10T18:00:00.000Z', 'new'),
    ]);

    expect(result).toMatchObject({
      source: 'entry',
      weightKg: 68.9,
      entry: { id: 'new' },
    });
  });

  it('revient au poids initial après suppression de la dernière pesée disponible', () => {
    expect(resolveCurrentWeight(70.5, [])).toEqual({
      source: 'profile',
      weightKg: 70.5,
    });
  });

  it('ignore les pesées invalides restaurées ou synchronisées', () => {
    const invalidDate = entry('date-invalide', 67);
    const invalidWeight = entry('2026-07-10', Number.NaN);

    expect(resolveCurrentWeight(70, [invalidDate, invalidWeight])).toEqual({
      source: 'profile',
      weightKg: 70,
    });
  });

  it('charge les pesées via le dépôt partagé', async () => {
    const listAll = vi.fn().mockResolvedValue([
      entry('2026-07-09', 69.2),
    ]);

    await expect(loadCurrentWeight(
      { initialWeightKg: 70 },
      { listAll },
    )).resolves.toMatchObject({
      source: 'entry',
      weightKg: 69.2,
    });
    expect(listAll).toHaveBeenCalledOnce();
  });
});
