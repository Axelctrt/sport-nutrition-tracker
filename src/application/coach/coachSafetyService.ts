import { calculateAgeYears } from '@/domain/calculations/age';
import {
  resolveCoachSafety,
  type CoachSafetyAssessment,
} from '@/domain/coach/coachSafety';
import type { CoachStateResult } from '@/domain/coach/coachState';
import type { StrengthPerformanceSnapshot } from '@/domain/coach/strengthPerformance';
import type { LocalDate } from '@/domain/models/common';
import type { DailyCheckIn, DailyCheckOut } from '@/domain/models/dailyCoaching';
import type { UserProfile } from '@/domain/models/profile';
import type { CalorieAdaptationAssessment } from '@/domain/models/weeklyReview';

export interface CalculateCoachSafetyInput {
  referenceDate: LocalDate;
  profile: Pick<UserProfile, 'ageInformation' | 'goal'>;
  coachStateResult: Pick<CoachStateResult, 'state'>;
  calorieAssessment: Pick<CalorieAdaptationAssessment, 'detectedState'>;
  strengthPerformance: StrengthPerformanceSnapshot;
  checkIns: readonly DailyCheckIn[];
  checkOuts: readonly DailyCheckOut[];
}

export interface CalculateImmediateCoachSafetyInput {
  referenceDate: LocalDate;
  profile: Pick<UserProfile, 'ageInformation'>;
  checkIns: readonly DailyCheckIn[];
  checkOuts: readonly DailyCheckOut[];
}

function currentContextFlags(
  referenceDate: LocalDate,
  checkIns: readonly DailyCheckIn[],
  checkOuts: readonly DailyCheckOut[],
) {
  const currentCheckIn = checkIns.find(({ date }) => date === referenceDate);
  const currentCheckOut = checkOuts.find(({ date }) => date === referenceDate);
  return [...new Set([
    ...(currentCheckIn?.contextFlags ?? []),
    ...(currentCheckOut?.contextFlags ?? []),
  ])];
}

export function calculateImmediateCoachSafety(
  input: CalculateImmediateCoachSafetyInput,
): CoachSafetyAssessment {
  return resolveCoachSafety({
    referenceDate: input.referenceDate,
    contextFlags: currentContextFlags(
      input.referenceDate,
      input.checkIns,
      input.checkOuts,
    ),
    ageYears: calculateAgeYears(input.profile.ageInformation, input.referenceDate),
  });
}

export function calculateCoachSafety(input: CalculateCoachSafetyInput): CoachSafetyAssessment {
  return resolveCoachSafety({
    referenceDate: input.referenceDate,
    coachState: input.coachStateResult.state,
    // The existing calorie engine emits degradedRecovery for loss only when
    // its already-qualified weight trend is also faster than the target.
    bodyTrendIsExcessive: input.calorieAssessment.detectedState === 'excessiveLoss'
      || (
        input.profile.goal === 'loss'
        && input.calorieAssessment.detectedState === 'degradedRecovery'
      ),
    strengthPerformance: input.strengthPerformance,
    contextFlags: currentContextFlags(
      input.referenceDate,
      input.checkIns,
      input.checkOuts,
    ),
    ageYears: calculateAgeYears(input.profile.ageInformation, input.referenceDate),
  });
}
