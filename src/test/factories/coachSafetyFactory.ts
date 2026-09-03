import type { CoachSafetyAssessment } from '@/domain/coach/coachSafety';

export function createCoachSafetyAssessment(
  overrides: Partial<CoachSafetyAssessment> = {},
): CoachSafetyAssessment {
  return {
    referenceDate: '2026-08-25',
    status: 'clear',
    concerns: [],
    reasons: [],
    blockingFactors: [],
    ...overrides,
  };
}
