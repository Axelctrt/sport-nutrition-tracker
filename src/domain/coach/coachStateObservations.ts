import {
  resolveDailyCheckInSignalEvidence,
  resolveDailyCheckOutSignalEvidence,
  resolveWeightEntryEvidence,
  type CoachSignalEvidence,
} from '@/domain/coach/coachSignalEvidence';
import type { LocalDate } from '@/domain/models/common';
import type {
  ExpectedStepsConfidence,
  ExpectedStepsSource,
  StepsSource,
} from '@/domain/models/steps';
import {
  buildCalorieAdaptationObservations,
  type BuildCalorieAdaptationObservationsInput,
} from '@/domain/reviews/calorieAdaptationObservations';

export interface CoachExpectedStepsObservation {
  value: number;
  source: ExpectedStepsSource;
  confidence: ExpectedStepsConfidence;
}

export interface CoachActualStepsObservation {
  value: number;
  source: StepsSource;
}

export interface CoachStateObservation {
  date: LocalDate;
  weight?: CoachSignalEvidence<number>;
  waistCm?: number;
  consumedCaloriesKcal?: number;
  targetCaloriesKcal?: number;
  proteinTargetMet?: boolean;
  journalComplete: boolean;
  expectedSteps: CoachExpectedStepsObservation;
  actualSteps?: CoachActualStepsObservation;
  sleepQuality?: NonNullable<ReturnType<typeof resolveDailyCheckInSignalEvidence>>;
  readiness?: NonNullable<ReturnType<typeof resolveDailyCheckInSignalEvidence>>;
  hunger?: NonNullable<ReturnType<typeof resolveDailyCheckOutSignalEvidence>>;
  energy?: NonNullable<ReturnType<typeof resolveDailyCheckOutSignalEvidence>>;
  hasTemporaryContext: boolean;
  strengthSessionCount: number;
}

export type BuildCoachStateObservationsInput =
  BuildCalorieAdaptationObservationsInput;

function indexByDate<T extends { date: LocalDate }>(
  entries: readonly T[],
): Map<LocalDate, T> {
  return new Map(entries.map((entry) => [entry.date, entry]));
}

export function buildCoachStateObservations(
  input: BuildCoachStateObservationsInput,
): CoachStateObservation[] {
  const historicalObservations = buildCalorieAdaptationObservations(input);
  const weights = indexByDate(input.weights);
  const targets = indexByDate(input.dailyTargets);
  const steps = indexByDate(input.dailySteps);
  const checkIns = indexByDate(input.checkIns);
  const checkOuts = indexByDate(input.checkOuts);

  return historicalObservations.map((observation) => {
    const weight = weights.get(observation.date);
    const target = targets.get(observation.date);
    const actualSteps = steps.get(observation.date);
    const checkIn = checkIns.get(observation.date);
    const checkOut = checkOuts.get(observation.date);
    const sleepQuality = checkIn
      ? resolveDailyCheckInSignalEvidence(checkIn, 'sleepQuality')
      : undefined;
    const readiness = checkIn
      ? resolveDailyCheckInSignalEvidence(checkIn, 'readiness')
      : undefined;
    const hunger = checkOut
      ? resolveDailyCheckOutSignalEvidence(checkOut, 'hunger')
      : undefined;
    const energy = checkOut
      ? resolveDailyCheckOutSignalEvidence(checkOut, 'energy')
      : undefined;

    return {
      date: observation.date,
      ...(weight ? { weight: resolveWeightEntryEvidence(weight) } : {}),
      ...(observation.waistCm === undefined
        ? {}
        : { waistCm: observation.waistCm }),
      ...(observation.consumedCaloriesKcal === undefined
        ? {}
        : { consumedCaloriesKcal: observation.consumedCaloriesKcal }),
      ...(observation.targetCaloriesKcal === undefined
        ? {}
        : { targetCaloriesKcal: observation.targetCaloriesKcal }),
      ...(observation.proteinTargetMet === undefined
        ? {}
        : { proteinTargetMet: observation.proteinTargetMet }),
      journalComplete: observation.journalComplete,
      expectedSteps: target?.stepBasis
        ? {
            value: target.stepBasis.steps,
            source: target.stepBasis.source,
            confidence: target.stepBasis.confidence,
          }
        : {
            value: input.fallbackExpectedSteps,
            source: 'profileFallback',
            confidence: 'fallback',
          },
      ...(actualSteps
        ? {
            actualSteps: {
              value: actualSteps.totalSteps,
              source: actualSteps.source,
            },
          }
        : {}),
      ...(sleepQuality ? { sleepQuality } : {}),
      ...(readiness ? { readiness } : {}),
      ...(hunger ? { hunger } : {}),
      ...(energy ? { energy } : {}),
      hasTemporaryContext: observation.hasTemporaryContext,
      strengthSessionCount: observation.strengthSessionCount,
    };
  });
}
