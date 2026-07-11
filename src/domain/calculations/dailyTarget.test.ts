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

    expect(result.targetWeeklyWeightChangePercentUsed).toBe(0);
    expect(result.goalRateWasNormalized).toBe(false);
    expect(result.macros).toEqual({
      proteinGrams: 110,
      carbohydratesGrams: 245,
      fatGrams: 55,
    });
    expect(result.calculationVersion).toBe(4);
  });

  it('normalise une variation incohérente avant de calculer la cible', () => {
    const result = calculateDailyTarget({
      date: '2026-06-23',
      profile: createEntity<UserProfile>(createProfileInput({
        goal: 'loss',
        targetWeeklyWeightChangePercent: 0.5,
      })),
      settings: createDefaultAppSettings(),
      weightKg: 60,
      totalSteps: 3_000,
      activities: [],
    });

    expect(result.targetWeeklyWeightChangePercentUsed).toBe(-0.5);
    expect(result.goalRateWasNormalized).toBe(true);
    expect(result.goalAdjustmentKcal).toBe(-330);
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

  it('ajoute intégralement la projection calorique planifiée à la cible', () => {
    const base = calculateDailyTarget({
      date: '2026-06-23',
      profile: createEntity<UserProfile>(createProfileInput()),
      settings: createDefaultAppSettings(),
      weightKg: 60,
      totalSteps: 3_000,
      activities: [],
    });
    const planned = calculateDailyTarget({
      date: '2026-06-23',
      profile: createEntity<UserProfile>(createProfileInput()),
      settings: createDefaultAppSettings(),
      weightKg: 60,
      totalSteps: 3_000,
      activities: [],
      plannedActivities: [{
        id: 'strengthSession:planned-1',
        source: 'strengthSession',
        sourceId: 'planned-1',
        title: 'Haut du corps',
        date: '2026-06-23',
        activityType: 'strengthTraining',
        estimatedCaloriesKcal: 210,
        weightKg: 60,
        calculationVersion: 1,
        basis: 'plannedDuration',
        durationMinutes: 60,
        metUsed: 3,
      }],
    });

    expect(planned.energy.plannedActivitiesKcal).toBe(210);
    expect(planned.energy.totalEstimatedExpenditureKcal)
      .toBe(base.energy.totalEstimatedExpenditureKcal + 210);
    expect(planned.targetCaloriesKcal).toBe(base.targetCaloriesKcal + 210);
    expect(planned.plannedActivities).toHaveLength(1);
  });

});
