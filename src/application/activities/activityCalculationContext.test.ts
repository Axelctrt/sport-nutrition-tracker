import { describe, expect, it, vi } from 'vitest';
import { resolveActivityCalculationContext } from '@/application/activities/activityCalculationContext';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';

describe('activityCalculationContext', () => {
  it('utilise la moyenne de la semaine précédente', async () => {
    const listBetween = vi.fn(async () => [
      createEntity({ date: '2026-06-30', weightKg: 80 }),
      createEntity({ date: '2026-07-02', weightKg: 79.6 }),
      createEntity({ date: '2026-07-05', weightKg: 79.8 }),
    ]);

    const result = await resolveActivityCalculationContext(
      '2026-07-09',
      createEntity(createProfileInput({ initialWeightKg: 82 })),
      { listBetween },
    );

    expect(listBetween).toHaveBeenCalledWith('2026-06-29', '2026-07-05');
    expect(result.weight.weightKg).toBeCloseTo(79.8, 10);
    expect(result.sourceLabel).toContain('3 jours');
  });

  it('se replie sur le poids du profil', async () => {
    const result = await resolveActivityCalculationContext(
      '2026-07-09',
      createEntity(createProfileInput({ initialWeightKg: 82 })),
      { listBetween: vi.fn(async () => []) },
    );

    expect(result.weight.source).toBe('profile');
    expect(result.weight.weightKg).toBe(82);
    expect(result.sourceLabel).toContain('poids du profil');
  });
});
