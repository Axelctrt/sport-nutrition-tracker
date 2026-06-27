import { CALCULATION_VERSION } from '@/domain/calculations/constants';
import { calculateMetCalories } from '@/domain/calculations/met';
import { calculateRunningCalories } from '@/domain/calculations/running';
import { assertNonNegativeNumber, assertPositiveNumber } from '@/domain/calculations/validation';
import type {
  Activity,
  ActivityCalculationSnapshot,
  CyclingActivity,
  OtherActivity,
  RunningActivity,
  StrengthTrainingActivity,
  SwimmingActivity,
} from '@/domain/models/activity';
import type { AppSettings } from '@/domain/models/settings';

export type ActivityForEstimate =
  | Pick<RunningActivity, 'type' | 'distanceKm'>
  | Pick<SwimmingActivity, 'type' | 'durationMinutes' | 'sessionType'>
  | Pick<CyclingActivity, 'type' | 'durationMinutes' | 'met'>
  | Pick<StrengthTrainingActivity, 'type' | 'durationMinutes' | 'met'>
  | Pick<OtherActivity, 'type' | 'durationMinutes' | 'met'>;

export function estimateActivityCalories(
  activity: ActivityForEstimate,
  weightKg: number,
  settings: AppSettings,
): ActivityCalculationSnapshot {
  assertPositiveNumber(weightKg, 'weightKg');

  if (activity.type === 'running') {
    return {
      weightKg,
      estimatedCaloriesKcal: calculateRunningCalories(
        weightKg,
        activity.distanceKm,
        settings.runningKcalPerKgPerKm,
      ),
      coefficientUsed: settings.runningKcalPerKgPerKm,
      calculationVersion: CALCULATION_VERSION,
    };
  }

  const met = activity.type === 'swimming'
    ? settings.swimmingMetValues[activity.sessionType]
    : activity.met;

  return {
    weightKg,
    estimatedCaloriesKcal: calculateMetCalories(
      activity.durationMinutes,
      met,
      weightKg,
    ),
    metUsed: met,
    calculationVersion: CALCULATION_VERSION,
  };
}

export function getEffectiveActivityCalories(activity: Activity): number {
  if (activity.manualCaloriesKcal !== undefined) {
    assertNonNegativeNumber(activity.manualCaloriesKcal, 'manualCaloriesKcal');
    return activity.manualCaloriesKcal;
  }

  assertNonNegativeNumber(
    activity.calculation.estimatedCaloriesKcal,
    'estimatedCaloriesKcal',
  );
  return activity.calculation.estimatedCaloriesKcal;
}
