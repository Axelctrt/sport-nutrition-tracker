import type {
  OtherActivity,
  RunningActivity,
  StrengthTrainingActivity,
} from '@/domain/models/activity';
import type { OccupationalActivity, UserProfile } from '@/domain/models/profile';
import type { AppSettings } from '@/domain/models/settings';
import type { WorkoutSession } from '@/domain/models/strength';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';

export const DAILY_ENERGY_REFERENCE_DATE = '2026-06-23' as const;
export const DAILY_ENERGY_REFERENCE_WEIGHT_KG = 60;

export const dailyEnergyReferenceExpectations = {
  bmrKcal: 1_601.25,
  occupationalBaseKcal: {
    sedentary: 1_921.5,
    lightlyActive: 2_001.5625,
    active: 2_161.6875,
    veryActive: 2_321.8125,
  },
  walkingAtEightThousandStepsKcal: 109.6515,
  walkingWithRunningAtTwelveThousandStepsKcal: 10.96515,
  runningKcal: 480,
  includedWalkingActivityKcal: 220.5,
  plannedStrengthKcal: 157.5,
  actualStrengthKcal: 252,
} as const;

export function createDailyEnergyReferenceSettings(): AppSettings {
  return createDefaultAppSettings();
}

export function createDailyEnergyReferenceProfile(
  occupationalActivity: OccupationalActivity = 'sedentary',
): UserProfile {
  return createEntity<UserProfile>(
    createProfileInput({ occupationalActivity }),
    `reference-profile-${occupationalActivity}`,
  );
}

export function createReferenceRunningActivity(): RunningActivity {
  return createEntity<RunningActivity>({
    type: 'running',
    date: DAILY_ENERGY_REFERENCE_DATE,
    time: '18:00',
    durationMinutes: 50,
    intensity: 'moderate',
    sessionType: 'easy',
    distanceKm: 8,
    averageCadenceSpm: 170,
    calculation: {
      weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
      estimatedCaloriesKcal: dailyEnergyReferenceExpectations.runningKcal,
      coefficientUsed: 1,
      calculationVersion: 1,
    },
  }, 'reference-run');
}

export function createReferenceWalkingActivity(
  includedInDailySteps: boolean,
): OtherActivity {
  return createEntity<OtherActivity>({
    type: 'walking',
    date: DAILY_ENERGY_REFERENCE_DATE,
    durationMinutes: 60,
    intensity: 'moderate',
    met: 3.5,
    includedInDailySteps,
    calculation: {
      weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
      estimatedCaloriesKcal:
        dailyEnergyReferenceExpectations.includedWalkingActivityKcal,
      metUsed: 3.5,
      calculationVersion: 1,
    },
  }, `reference-walk-${includedInDailySteps ? 'included' : 'separate'}`);
}

export function createReferenceStrengthSession(): WorkoutSession {
  return createEntity<WorkoutSession>({
    date: DAILY_ENERGY_REFERENCE_DATE,
    status: 'planned',
    plannedDate: DAILY_ENERGY_REFERENCE_DATE,
    plannedDurationMinutes: 60,
    strengthSessionStyle: 'classic',
    sourceTemplateNameSnapshot: 'Reference strength',
  }, 'reference-strength-session');
}

export function createReferenceStrengthActivity(): StrengthTrainingActivity {
  return createEntity<StrengthTrainingActivity>({
    type: 'strengthTraining',
    date: DAILY_ENERGY_REFERENCE_DATE,
    durationMinutes: 60,
    intensity: 'moderate',
    met: 5,
    plannedActivity: {
      source: 'strengthSession',
      sourceId: 'reference-strength-session',
    },
    calculation: {
      weightKg: DAILY_ENERGY_REFERENCE_WEIGHT_KG,
      estimatedCaloriesKcal:
        dailyEnergyReferenceExpectations.actualStrengthKcal,
      metUsed: 5,
      calculationVersion: 2,
    },
  }, 'reference-strength-activity');
}
