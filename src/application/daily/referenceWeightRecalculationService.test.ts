import { describe, expect, it, vi } from 'vitest';
import {
  getAffectedTargetWeek,
  recalculateTargetsAfterWeightChange,
  selectTargetDatesToRecalculate,
  type ReferenceWeightRecalculationDependencies,
} from '@/application/daily/referenceWeightRecalculationService';
import type { DailyTarget } from '@/domain/models/targets';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';

function target(date: string): DailyTarget {
  return createEntity({
    date,
    calculationWeightKg: 60,
    energy: {
      bmrKcal: 1_600,
      occupationalBaseKcal: 1_920,
      walkingKcal: 0,
      runningKcal: 0,
      swimmingKcal: 0,
      strengthTrainingKcal: 0,
      otherActivitiesKcal: 0,
      totalEstimatedExpenditureKcal: 1_920,
    },
    goalAdjustmentKcal: 0,
    acceptedCalibrationAdjustmentKcal: 0,
    calorieFloorKcal: 1_760,
    targetCaloriesKcal: 1_920,
    macros: { proteinGrams: 110, carbohydratesGrams: 245, fatGrams: 55 },
    calculationVersion: 1,
  });
}

describe('recalcul après changement de pesée', () => {
  it('identifie la semaine suivante comme période affectée', () => {
    expect(getAffectedTargetWeek('2026-07-02')).toEqual({
      start: '2026-07-06',
      end: '2026-07-12',
    });
  });

  it('recalcule aujourd’hui et les cibles futures déjà persistées', () => {
    expect(selectTargetDatesToRecalculate(
      { start: '2026-07-06', end: '2026-07-12' },
      '2026-07-09',
      [target('2026-07-07'), target('2026-07-10'), target('2026-07-12')],
    )).toEqual(['2026-07-09', '2026-07-10', '2026-07-12']);
  });

  it('ne réécrit pas une semaine entièrement terminée', () => {
    expect(selectTargetDatesToRecalculate(
      { start: '2026-06-29', end: '2026-07-05' },
      '2026-07-09',
      [target('2026-07-01')],
    )).toEqual([]);
  });

  it('ne crée pas spontanément les sept cibles d’une semaine future', () => {
    expect(selectTargetDatesToRecalculate(
      { start: '2026-07-13', end: '2026-07-19' },
      '2026-07-09',
      [target('2026-07-15')],
    )).toEqual(['2026-07-15']);
  });

  it('exécute les recalculs retenus avec le profil courant', async () => {
    const calculateTarget = vi.fn(async () => undefined);
    const dependencies: ReferenceWeightRecalculationDependencies = {
      targets: {
        listTargetsBetween: vi.fn(async () => [target('2026-07-10')]),
      },
      calculateTarget,
      today: () => '2026-07-09',
    };
    const profile = createEntity(createProfileInput());

    await expect(recalculateTargetsAfterWeightChange(
      '2026-07-02',
      profile,
      dependencies,
    )).resolves.toEqual(['2026-07-09', '2026-07-10']);

    expect(calculateTarget).toHaveBeenCalledTimes(2);
    expect(calculateTarget).toHaveBeenCalledWith('2026-07-09', profile);
    expect(calculateTarget).toHaveBeenCalledWith('2026-07-10', profile);
  });
});
