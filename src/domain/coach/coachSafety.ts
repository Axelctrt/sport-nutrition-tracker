import type { CoachState } from '@/domain/coach/coachState';
import type { StrengthPerformanceSnapshot } from '@/domain/coach/strengthPerformance';
import type { DailyContextFlag } from '@/domain/models/dailyCoaching';
import type { LocalDate } from '@/domain/models/common';

export const COACH_SAFETY_STATUSES = [
  'clear',
  'caution',
  'doNotIntensify',
] as const;

export type CoachSafetyStatus = (typeof COACH_SAFETY_STATUSES)[number];

export const COACH_SAFETY_DOMAINS = [
  'bodyTrend',
  'recovery',
  'performance',
  'acuteContext',
  'eligibility',
] as const;

export type CoachSafetyDomain = (typeof COACH_SAFETY_DOMAINS)[number];

export interface CoachSafetyConcern {
  domain: CoachSafetyDomain;
  reasons: string[];
  immediateVeto: boolean;
}

export interface CoachSafetyAssessment {
  referenceDate: LocalDate;
  status: CoachSafetyStatus;
  concerns: CoachSafetyConcern[];
  reasons: string[];
  blockingFactors: string[];
}

export interface ResolveCoachSafetyInput {
  referenceDate: LocalDate;
  coachState: CoachState;
  bodyTrendIsExcessive?: boolean;
  strengthPerformance: Pick<StrengthPerformanceSnapshot, 'exercises'>;
  contextFlags: readonly DailyContextFlag[];
  ageYears?: number;
}

const BODY_TREND_REASON = 'La perte observée est plus rapide que le rythme prévu.';
const RECOVERY_REASON = 'Les signaux confirmés indiquent une récupération dégradée.';
const PERFORMANCE_REASON = 'Les performances de musculation présentent une baisse confirmée.';
const ILLNESS_REASON = 'Une maladie est signalée dans le check-in du jour.';
const PAIN_OR_INJURY_REASON = 'Une douleur ou blessure est signalée dans le check-in du jour.';
const AGE_REASON = 'Les ajustements de cible calorique ne sont pas proposés avant 18 ans.';

function concern(
  domain: CoachSafetyDomain,
  reasons: string[],
  immediateVeto = false,
): CoachSafetyConcern {
  return { domain, reasons, immediateVeto };
}

export function resolveCoachSafety(input: ResolveCoachSafetyInput): CoachSafetyAssessment {
  const concerns: CoachSafetyConcern[] = [];

  if (input.coachState === 'excessiveLoss' || input.bodyTrendIsExcessive) {
    concerns.push(concern('bodyTrend', [BODY_TREND_REASON]));
  }
  if (input.coachState === 'degradedRecovery') {
    concerns.push(concern('recovery', [RECOVERY_REASON]));
  }
  if (input.strengthPerformance.exercises.some(({ trend }) => trend === 'degrading')) {
    concerns.push(concern('performance', [PERFORMANCE_REASON]));
  }

  const acuteReasons: string[] = [];
  if (input.contextFlags.includes('illness')) acuteReasons.push(ILLNESS_REASON);
  if (input.contextFlags.includes('painOrInjury')) acuteReasons.push(PAIN_OR_INJURY_REASON);
  if (acuteReasons.length > 0) {
    concerns.push(concern('acuteContext', acuteReasons, true));
  }
  if (input.ageYears !== undefined && input.ageYears < 18) {
    concerns.push(concern('eligibility', [AGE_REASON], true));
  }

  const reasons = concerns.flatMap(({ reasons: concernReasons }) => concernReasons);
  const status: CoachSafetyStatus = concerns.some(({ immediateVeto }) => immediateVeto)
    || concerns.length >= 2
    ? 'doNotIntensify'
    : concerns.length === 1
      ? 'caution'
      : 'clear';

  return {
    referenceDate: input.referenceDate,
    status,
    concerns,
    reasons,
    blockingFactors: status === 'doNotIntensify' ? [...reasons] : [],
  };
}

export function doesCoachSafetyBlockCalorieDecrease(
  assessment: CoachSafetyAssessment,
): boolean {
  return assessment.status === 'doNotIntensify'
    || assessment.concerns.some(({ domain }) => domain === 'bodyTrend');
}
