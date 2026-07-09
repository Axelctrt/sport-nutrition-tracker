import { calculateAgeYears } from '@/domain/calculations/age';
import { getEffectiveActivityCalories } from '@/domain/calculations/activityCalories';
import { calculateMifflinStJeor } from '@/domain/calculations/bmr';
import { calculateOccupationalBaseCalories } from '@/domain/calculations/occupationalActivity';
import { calculateRunningSteps } from '@/domain/calculations/running';
import { assertPositiveNumber } from '@/domain/calculations/validation';
import {
  calculateAdditionalWalking,
  type AdditionalWalkingResult,
} from '@/domain/calculations/walking';
import { CalculationError } from '@/domain/errors/CalculationError';
import type { Activity } from '@/domain/models/activity';
import type { LocalDate } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import type { PlannedActivityCalorieSnapshot } from '@/domain/models/plannedActivity';
import type { AppSettings } from '@/domain/models/settings';
import type { DailyEnergyBreakdown } from '@/domain/models/targets';

export interface DailyExpenditureInput {
  date: LocalDate;
  profile: UserProfile;
  settings: AppSettings;
  weightKg: number;
  totalSteps: number;
  activities: readonly Activity[];
  plannedActivities?: readonly PlannedActivityCalorieSnapshot[];
}

export interface DailyExpenditureResult {
  ageYears: number;
  energy: DailyEnergyBreakdown;
  steps: AdditionalWalkingResult;
}

export function calculateDailyExpenditure({
  date,
  profile,
  settings,
  weightKg,
  totalSteps,
  activities,
  plannedActivities = [],
}: DailyExpenditureInput): DailyExpenditureResult {
  assertPositiveNumber(weightKg, 'weightKg');

  for (const activity of activities) {
    if (activity.date !== date) {
      throw new CalculationError(
        `L’activité ${activity.id} n’appartient pas à la journée ${date}.`,
        'INCONSISTENT_DATE',
        'activities',
      );
    }
  }


  for (const plannedActivity of plannedActivities) {
    if (plannedActivity.date !== date) {
      throw new CalculationError(
        `L’activité prévue ${plannedActivity.id} n’appartient pas à la journée ${date}.`,
        'INCONSISTENT_DATE',
        'plannedActivities',
      );
    }
  }

  const ageYears = calculateAgeYears(profile.ageInformation, date);
  const bmrKcal = calculateMifflinStJeor({
    sex: profile.sexForEnergyEquation,
    weightKg,
    heightCm: profile.heightCm,
    ageYears,
  });
  const occupationalBaseKcal = calculateOccupationalBaseCalories(
    bmrKcal,
    profile.occupationalActivity,
  );

  let runningSteps = 0;
  let runningKcal = 0;
  let swimmingKcal = 0;
  let strengthTrainingKcal = 0;
  let otherActivitiesKcal = 0;

  for (const activity of activities) {
    const calories = getEffectiveActivityCalories(activity);

    switch (activity.type) {
      case 'running':
        runningSteps += calculateRunningSteps(
          activity.durationMinutes,
          activity.averageCadenceSpm,
        );
        runningKcal += calories;
        break;
      case 'swimming':
        swimmingKcal += calories;
        break;
      case 'strengthTraining':
        strengthTrainingKcal += calories;
        break;
      case 'walking':
        if (!activity.includedInDailySteps) {
          otherActivitiesKcal += calories;
        }
        break;
      case 'cycling':
      case 'otherCardio':
        otherActivitiesKcal += calories;
        break;
    }
  }

  const steps = calculateAdditionalWalking({
    totalSteps,
    runningSteps,
    includedBaseSteps: settings.includedBaseSteps,
    heightCm: profile.heightCm,
    weightKg,
    kcalPerKgPerKm: settings.walkingKcalPerKgPerKm,
  });

  const plannedActivitiesKcal = plannedActivities.reduce(
    (total, activity) => total + activity.estimatedCaloriesKcal,
    0,
  );
  const totalEstimatedExpenditureKcal = occupationalBaseKcal
    + steps.caloriesKcal
    + runningKcal
    + swimmingKcal
    + strengthTrainingKcal
    + otherActivitiesKcal
    + plannedActivitiesKcal;

  return {
    ageYears,
    steps,
    energy: {
      bmrKcal,
      occupationalBaseKcal,
      walkingKcal: steps.caloriesKcal,
      runningKcal,
      swimmingKcal,
      strengthTrainingKcal,
      otherActivitiesKcal,
      plannedActivitiesKcal,
      totalEstimatedExpenditureKcal,
    },
  };
}
