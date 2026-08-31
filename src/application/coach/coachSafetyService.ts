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

export function calculateCoachSafety(input: CalculateCoachSafetyInput): CoachSafetyAssessment {
  const currentCheckIn = input.checkIns.find(({ date }) => date === input.referenceDate);
  const currentCheckOut = input.checkOuts.find(({ date }) => date === input.referenceDate);
  const contextFlags = [...new Set([
    ...(currentCheckIn?.contextFlags ?? []),
    ...(currentCheckOut?.contextFlags ?? []),
  ])];

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
    contextFlags,
    ageYears: calculateAgeYears(input.profile.ageInformation, input.referenceDate),
  });
}
