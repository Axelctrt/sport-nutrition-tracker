import { describe, expect, it } from 'vitest';
import { buildPlannedActivityCalories } from '@/application/planning/plannedActivityCalories';
import { calculateDailyExpenditure } from '@/domain/calculations/expenditure';
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
  dailyEnergyReferenceExpectations,
} from '@/test/fixtures/dailyEnergyReferenceScenarios';

const occupationalActivities: readonly OccupationalActivity[] = [
  'sedentary',
  'lightlyActive',
  'active',
  'veryActive',
];

describe('daily energy reference scenarios', () => {
  const settings = createDailyEnergyReferenceSettings();

  it.each(occupationalActivities)(
    'freezes the current occupational base for %s',
    (occupationalActivity) => {
      const result = calculateDailyExpenditure({
        date: DAILY_ENERGY_REFERENCE_DATE,
        profile: createDailyEnergyReferenceProfile(occupationalActivity),
        settings,
        weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
        totalSteps: settings.includedBaseSteps,
        activities: [],
      });

      expect(result.energy.bmrKcal)
        .toBe(dailyEnergyReferenceExpectations.bmrKcal);
      expect(result.energy.occupationalBaseKcal).toBe(
        dailyEnergyReferenceExpectations
          .occupationalBaseKcal[occupationalActivity],
      );
      expect(result.energy.walkingKcal).toBe(0);
      expect(result.energy.totalEstimatedExpenditureKcal)
        .toBe(result.energy.occupationalBaseKcal);
    },
  );

  it('keeps measured walking additive to every occupational base', () => {
    const totals = occupationalActivities.map((occupationalActivity) => {
      const result = calculateDailyExpenditure({
        date: DAILY_ENERGY_REFERENCE_DATE,
        profile: createDailyEnergyReferenceProfile(occupationalActivity),
        settings,
        weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
        totalSteps: 8_000,
        activities: [],
      });

      expect(result.energy.walkingKcal).toBeCloseTo(
        dailyEnergyReferenceExpectations.walkingAtEightThousandStepsKcal,
        6,
      );
      return result.energy.totalEstimatedExpenditureKcal;
    });

    expect(totals).toEqual([
      2_031.1515,
      2_111.214,
      2_271.339,
      2_431.464,
    ]);
  });

  it('subtracts running steps before estimating additional walking', () => {
    const result = calculateDailyExpenditure({
      date: DAILY_ENERGY_REFERENCE_DATE,
      profile: createDailyEnergyReferenceProfile(),
      settings,
      weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
      totalSteps: 12_000,
      activities: [createReferenceRunningActivity()],
    });

    expect(result.steps.runningSteps).toBe(8_500);
    expect(result.steps.nonRunningSteps).toBe(3_500);
    expect(result.steps.additionalSteps).toBe(500);
    expect(result.energy.walkingKcal).toBeCloseTo(
      dailyEnergyReferenceExpectations
        .walkingWithRunningAtTwelveThousandStepsKcal,
      6,
    );
    expect(result.energy.runningKcal)
      .toBe(dailyEnergyReferenceExpectations.runningKcal);
    expect(result.energy.totalEstimatedExpenditureKcal)
      .toBeCloseTo(2_412.46515, 6);
  });

  it('does not add a walking activity already represented by daily steps', () => {
    const included = calculateDailyExpenditure({
      date: DAILY_ENERGY_REFERENCE_DATE,
      profile: createDailyEnergyReferenceProfile(),
      settings,
      weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
      totalSteps: 8_000,
      activities: [createReferenceWalkingActivity(true)],
    });
    const separate = calculateDailyExpenditure({
      date: DAILY_ENERGY_REFERENCE_DATE,
      profile: createDailyEnergyReferenceProfile(),
      settings,
      weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
      totalSteps: 8_000,
      activities: [createReferenceWalkingActivity(false)],
    });

    expect(included.energy.otherActivitiesKcal).toBe(0);
    expect(included.energy.totalEstimatedExpenditureKcal)
      .toBeCloseTo(2_031.1515, 6);
    expect(separate.energy.otherActivitiesKcal)
      .toBe(dailyEnergyReferenceExpectations.includedWalkingActivityKcal);
    expect(separate.energy.totalEstimatedExpenditureKcal)
      .toBeCloseTo(2_251.6515, 6);
  });

  it('counts a planned strength projection once before completion', () => {
    const projections = buildPlannedActivityCalories({
      date: DAILY_ENERGY_REFERENCE_DATE,
      weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
      settings,
      activities: [],
      strengthSessions: [createReferenceStrengthSession()],
      enduranceSessions: [],
    });
    const result = calculateDailyExpenditure({
      date: DAILY_ENERGY_REFERENCE_DATE,
      profile: createDailyEnergyReferenceProfile(),
      settings,
      weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
      totalSteps: settings.includedBaseSteps,
      activities: [],
      plannedActivities: projections,
    });

    expect(projections).toHaveLength(1);
    expect(result.energy.plannedActivitiesKcal)
      .toBe(dailyEnergyReferenceExpectations.plannedStrengthKcal);
    expect(result.energy.strengthTrainingKcal).toBe(0);
    expect(result.energy.totalEstimatedExpenditureKcal).toBe(2_079);
  });

  it('replaces a linked strength projection with the actual activity', () => {
    const actualActivity = createReferenceStrengthActivity();
    const projections = buildPlannedActivityCalories({
      date: DAILY_ENERGY_REFERENCE_DATE,
      weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
      settings,
      activities: [actualActivity],
      strengthSessions: [createReferenceStrengthSession()],
      enduranceSessions: [],
    });
    const result = calculateDailyExpenditure({
      date: DAILY_ENERGY_REFERENCE_DATE,
      profile: createDailyEnergyReferenceProfile(),
      settings,
      weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
      totalSteps: settings.includedBaseSteps,
      activities: [actualActivity],
      plannedActivities: projections,
    });

    expect(projections).toEqual([]);
    expect(result.energy.plannedActivitiesKcal).toBe(0);
    expect(result.energy.strengthTrainingKcal)
      .toBe(dailyEnergyReferenceExpectations.actualStrengthKcal);
    expect(result.energy.totalEstimatedExpenditureKcal).toBe(2_173.5);
  });
});
