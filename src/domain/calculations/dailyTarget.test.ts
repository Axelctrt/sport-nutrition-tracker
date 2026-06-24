import { describe, expect, it } from 'vitest';
import { calculateDailyTarget } from '@/domain/calculations/dailyTarget';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { UserProfile } from '@/domain/models/profile';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';

 describe('calcul quotidien complet', () => {
  it('produit une cible cohérente sans activité supplémentaire', () => {
    const result = calculateDailyTarget({
      date: '2026-06-23',
      profile: createEntity<UserProfile>(createProfileInput()),
      settings: createDefaultAppSettings(),
      weightKg: 60,
      totalSteps: 3_000,
      activities: [],
    });

    expect(result.calculationWeightKg).toBe(60);
    expect(result.energy.totalEstimatedExpenditureKcal).toBe(1_921.5);
    expect(result.targetCaloriesKcal).toBe(1_920);
    expect(result.macros).toEqual({
      proteinGrams: 110,
      carbohydratesGrams: 245,
      fatGrams: 55,
    });
    expect(result.calculationVersion).toBe(1);
  });

  it('intègre un ajustement calorique accepté', () => {
    const result = calculateDailyTarget({
      date: '2026-06-23',
      profile: createEntity<UserProfile>(createProfileInput()),
      settings: createDefaultAppSettings(),
      weightKg: 60,
      totalSteps: 3_000,
      activities: [],
      acceptedCalibrationAdjustmentKcal: 100,
    });

    expect(result.acceptedCalibrationAdjustmentKcal).toBe(100);
    expect(result.targetCaloriesKcal).toBe(2_020);
  });
});
