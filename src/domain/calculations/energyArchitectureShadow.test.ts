import { describe, expect, it } from 'vitest';
import { buildPlannedActivityCalories } from '@/application/planning/plannedActivityCalories';
import {
  compareEnergyArchitectures,
  OCCUPATIONAL_REFERENCE_STEPS,
} from '@/domain/calculations/energyArchitectureShadow';
import type { OccupationalActivity } from '@/domain/models/profile';
import {
  DAILY_ENERGY_REFERENCE_DATE,
  DAILY_ENERGY_REFERENCE_WEIGHT_KG,
  createDailyEnergyReferenceProfile,
  createDailyEnergyReferenceSettings,
  createReferenceRunningActivity,
  createReferenceStrengthActivity,
  createReferenceStrengthSession,
  createReferenceWalkingActivity,
} from '@/test/fixtures/dailyEnergyReferenceScenarios';

const settings = createDailyEnergyReferenceSettings();
const occupationalActivities: OccupationalActivity[] = [
  'sedentary',
  'lightlyActive',
  'active',
  'veryActive',
];

function compare(
  occupationalActivity: OccupationalActivity,
  totalSteps: number,
) {
  return compareEnergyArchitectures({
    date: DAILY_ENERGY_REFERENCE_DATE,
    profile: createDailyEnergyReferenceProfile(occupationalActivity),
    settings,
    weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
    totalSteps,
    activities: [],
  });
}

describe('energy architecture shadow comparison', () => {
  it.each(occupationalActivities)(
    'reste identique au moteur actuel à la base pour %s',
    (occupationalActivity) => {
      const result = compare(
        occupationalActivity,
        settings.includedBaseSteps,
      );

      expect(result.candidateTotalKcal).toBe(result.currentTotalKcal);
      expect(result.possibleOverlapKcal).toBe(0);
      expect(result.overlapRisk).toBe('negligible');
    },
  );

  it('ne modifie jamais le profil sédentaire lorsque les pas augmentent', () => {
    const result = compare('sedentary', 12_000);

    expect(result.fullOccupationalUpliftKcal).toBe(0);
    expect(result.candidateTotalKcal).toBe(result.currentTotalKcal);
    expect(result.overlapRisk).toBe('negligible');
  });

  it.each([
    ['lightlyActive', 2_089.28, 2_029.24, 60.05, 'possible'],
    ['active', 2_293.27, 2_149.16, 144.11, 'possible'],
    ['veryActive', 2_497.25, 2_297.1, 200.16, 'material'],
  ] as const)(
    'mesure le chevauchement au niveau de pas de référence pour %s',
    (
      occupationalActivity,
      expectedCurrent,
      expectedCandidate,
      expectedOverlap,
      expectedRisk,
    ) => {
      const result = compare(
        occupationalActivity,
        OCCUPATIONAL_REFERENCE_STEPS[occupationalActivity],
      );

      expect(result.currentTotalKcal).toBe(expectedCurrent);
      expect(result.candidateTotalKcal).toBe(expectedCandidate);
      expect(result.possibleOverlapKcal).toBeCloseTo(expectedOverlap, 1);
      expect(result.overlapRisk).toBe(expectedRisk);
      expect(result.candidateTotalKcal).toBeLessThan(result.currentTotalKcal);
    },
  );

  it('conserve une part professionnelle résiduelle non captée par les pas', () => {
    const result = compare('veryActive', 20_000);

    expect(result.stepCapturedOccupationalShare).toBe(1);
    expect(result.minimumNonStepShare).toBe(0.5);
    expect(result.candidateOccupationalResidualKcal)
      .toBeCloseTo(result.fullOccupationalUpliftKcal * 0.5, 1);
  });

  it('ne conclut pas sans pas mesurés pour un profil professionnel actif', () => {
    const result = compare('active', 0);

    expect(result.candidateTotalKcal).toBe(result.currentTotalKcal);
    expect(result.overlapRisk).toBe('unassessable');
  });

  it('réutilise le retrait des pas de course du moteur actuel', () => {
    const result = compareEnergyArchitectures({
      date: DAILY_ENERGY_REFERENCE_DATE,
      profile: createDailyEnergyReferenceProfile('active'),
      settings,
      weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
      totalSteps: 12_000,
      activities: [createReferenceRunningActivity()],
    });

    expect(result.measuredNonRunningSteps).toBe(3_500);
    expect(result.measuredAdditionalSteps).toBe(500);
    expect(result.stepCapturedOccupationalShare).toBeCloseTo(0.083, 3);
  });

  it('conserve la marche incluse dans les pas sans la recompter', () => {
    const withoutActivity = compare('active', 8_000);
    const withIncludedWalking = compareEnergyArchitectures({
      date: DAILY_ENERGY_REFERENCE_DATE,
      profile: createDailyEnergyReferenceProfile('active'),
      settings,
      weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
      totalSteps: 8_000,
      activities: [createReferenceWalkingActivity(true)],
    });

    expect(withIncludedWalking.candidateTotalKcal)
      .toBe(withoutActivity.candidateTotalKcal);
  });

  it('préserve la réconciliation entre sport prévu et réalisé', () => {
    const session = createReferenceStrengthSession();
    const actual = createReferenceStrengthActivity();
    const planned = buildPlannedActivityCalories({
      date: DAILY_ENERGY_REFERENCE_DATE,
      weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
      settings,
      activities: [],
      strengthSessions: [session],
      enduranceSessions: [],
    });
    const reconciled = buildPlannedActivityCalories({
      date: DAILY_ENERGY_REFERENCE_DATE,
      weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
      settings,
      activities: [actual],
      strengthSessions: [session],
      enduranceSessions: [],
    });

    const before = compareEnergyArchitectures({
      date: DAILY_ENERGY_REFERENCE_DATE,
      profile: createDailyEnergyReferenceProfile('active'),
      settings,
      weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
      totalSteps: settings.includedBaseSteps,
      activities: [],
      plannedActivities: planned,
    });
    const after = compareEnergyArchitectures({
      date: DAILY_ENERGY_REFERENCE_DATE,
      profile: createDailyEnergyReferenceProfile('active'),
      settings,
      weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
      totalSteps: settings.includedBaseSteps,
      activities: [actual],
      plannedActivities: reconciled,
    });

    expect(planned).toHaveLength(1);
    expect(reconciled).toEqual([]);
    expect(before.differenceKcal).toBe(0);
    expect(after.differenceKcal).toBe(0);
  });
});
