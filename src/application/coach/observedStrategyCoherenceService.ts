import { calculateIntegratedCoachAnalysis } from '@/application/coach/integratedCoachDecisionService';
import { calculateImmediateCoachSafety } from '@/application/coach/coachSafetyService';
import { getDailyCoachAnalysisPeriod } from '@/application/coach/dailyCoachService';
import { composeAppSettings, normalizeDeviceSettings, normalizeUserSettings } from '@/domain/defaults/appSettings';
import { DEVICE_SETTINGS_ID, LOCAL_USER_PROFILE_ID, USER_SETTINGS_ID } from '@/domain/defaults/identifiers';
import { buildCoachStateObservations } from '@/domain/coach/coachStateObservations';
import { projectActiveStrategy } from '@/domain/coach/coachStrategyState';
import {
  resolveObservedStrategyCoherence, type ObservedStrategyCoherenceInput,
  type StrategyObservationEvidence, type StrategySourceReference,
} from '@/domain/coach/observedStrategyCoherence';
import type { StrategyReadonly } from '@/domain/coach/coachStrategy';
import type { CoachReviewAnalysis } from '@/domain/coach/coachReview';
import type { CoachStrategySources } from '@/infrastructure/repositories/contracts/CoachStrategyRepository';
import { coachStrategyStateSchema } from '@/shared/validation/coachStrategyStateSchema';
import { isValidLocalDate } from '@/shared/validation/localDate';

export interface AssembleObservedStrategyCoherenceInput {
  referenceDate: string;
  referenceWeightKg: number;
  strategyState?: unknown;
  /** Caller supplies one coherent, account-isolated read snapshot. No repository is opened here. */
  sources: StrategyReadonly<CoachStrategySources>;
}

const between = <T extends { date: string }>(rows: T[], from: string, to: string) =>
  rows.filter(({ date }) => date >= from && date <= to);

function reference(collection: string, row: { id: string; date: string }, provenance: string, fields: string[]): StrategySourceReference {
  return { collection, id: row.id, date: row.date, provenance, fields };
}

function canonicalReferences(refs: StrategyReadonly<StrategySourceReference[]>): StrategySourceReference[] {
  const byKey = new Map(refs.map((ref) => [`${ref.collection}:${ref.id}:${ref.fields.join(',')}`, { ...ref, fields: [...ref.fields] }]));
  return [...byKey.values()].sort((a, b) => `${a.date}:${a.collection}:${a.id}:${a.fields}`
    .localeCompare(`${b.date}:${b.collection}:${b.id}:${b.fields}`));
}

function evidenceFromSources(sources: CoachStrategySources, analysis: CoachReviewAnalysis): StrategyObservationEvidence[] {
  const { analysisStart, analysisEnd } = analysis.calorieAssessment;
  const profile = sources.userProfile.find(({ id }) => id === LOCAL_USER_PROFILE_ID)!;
  const weights = between(sources.weights, analysisStart, analysisEnd);
  const checkIns = between(sources.dailyCheckIns, analysisStart, analysisEnd);
  const checkOuts = between(sources.dailyCheckOuts, analysisStart, analysisEnd);
  const targets = between(sources.dailyTargets, analysisStart, analysisEnd);
  const steps = between(sources.dailySteps, analysisStart, analysisEnd);
  const food = between(sources.foodEntries, analysisStart, analysisEnd);
  const journals = between(sources.dailyJournalStatuses, analysisStart, analysisEnd);
  const observations = buildCoachStateObservations({ analysisStart, analysisEnd,
    fallbackExpectedSteps: profile.dailyStepGoal, weights, checkIns, checkOuts,
    dailyTargets: targets, dailySteps: steps, foodEntries: food, journalStatuses: journals,
    activities: between(sources.activities, analysisStart, analysisEnd),
    workoutSessions: between(sources.workoutSessions, analysisStart, analysisEnd) });
  const evidence: StrategyObservationEvidence[] = [];
  const add = (domain: StrategyObservationEvidence['domain'], refs: StrategySourceReference[],
    reasons: string[] = [], interpretation: StrategyObservationEvidence['interpretation'] = 'qualifiedObservation') => {
    if (refs.length) evidence.push({ domain, origin: 'c1c4', sourceReferences: canonicalReferences(refs),
      dependentSourceReferences: [], interpretation, freshness: 'canonicalWindow', reasons });
  };
  add('bodyTrend', weights.filter(({ provenance }) => provenance === 'userMeasurement')
    .map((row) => reference('weights', row, 'userMeasured/confirmed', ['weightKg'])),
  analysis.coachStateResult.reasons);
  add('bodyTrend', checkIns.filter(({ waistCm }) => waistCm !== undefined)
    .map((row) => reference('dailyCheckIns', row, 'datedMeasurementWithoutDedicatedQualityContract', ['waistCm'])),
  ['waistQualityNotContracted'], 'contextOnly');
  const comparableFoodDates = new Set(observations.filter((row) => row.journalComplete
    && row.consumedCaloriesKcal !== undefined && row.targetCaloriesKcal !== undefined
    && row.targetCaloriesKcal > 0).map(({ date }) => date));
  add('nutrition', [
    ...food.filter(({ date }) => comparableFoodDates.has(date)).map((row) => reference('foodEntries', row, 'recordedIntake', ['reference'])),
    ...targets.filter(({ date }) => comparableFoodDates.has(date)).map((row) => reference('dailyTargets', row, 'existingTarget', ['targetCaloriesKcal', 'macros'])),
    ...journals.filter(({ date }) => comparableFoodDates.has(date)).map((row) => reference('dailyJournalStatuses', row, 'userReported', ['isComplete'])),
    ...checkOuts.filter(({ date }) => comparableFoodDates.has(date)).map((row) => reference('dailyCheckOuts', row, 'userReported', ['foodJournalComplete'])),
  ], analysis.calorieAssessment.reasons);
  const comparableStepDates = new Set(observations.filter((row) => row.actualSteps !== undefined
    && row.expectedSteps.confidence !== 'fallback' && row.expectedSteps.value > 0).map(({ date }) => date));
  add('activity', [
    ...steps.filter(({ date }) => comparableStepDates.has(date)).map((row) => reference('dailySteps', row, row.source, ['totalSteps'])),
    ...targets.filter(({ date }) => comparableStepDates.has(date)).map((row) => reference('dailyTargets', row,
      `${row.stepBasis?.source}/${row.stepBasis?.confidence}`, ['stepBasis'])),
  ]);
  add('recovery', [
    ...checkIns.flatMap((row) => (['sleepQuality', 'readiness'] as const)
      .filter((field) => row[field] !== undefined && row.signalProvenance?.[field] === 'userReported')
      .map((field) => reference('dailyCheckIns', row, 'userReported/confirmed', [field]))),
    ...checkOuts.flatMap((row) => (['hunger', 'energy'] as const)
      .filter((field) => row[field] !== undefined && row.signalProvenance?.[field] === 'userReported')
      .map((field) => reference('dailyCheckOuts', row, 'userReported/confirmed', [field]))),
  ]);
  for (const exercise of analysis.strengthPerformance.exercises) {
    const refs = exercise.exposures.flatMap((exposure) => [
      reference('workoutSessions', { id: exposure.sessionId, date: exposure.date }, 'completedSession', ['status']),
      reference('workoutSessionExercises', { id: exposure.sessionExerciseId, date: exposure.date }, 'exerciseSnapshot', ['trackingModeSnapshot', 'loadUnitSnapshot', 'plannedSets']),
      reference('strengthSets', { id: exposure.bestSet.setId, date: exposure.date }, 'completedSet', ['repetitions', 'weightKg', 'rpe', 'durationSeconds', 'distanceMeters']),
    ]);
    const dependencies = exercise.exposures.flatMap((exposure) => {
      if (exposure.trackingMode !== 'bodyweightRepetitions' && exposure.trackingMode !== 'assistedRepetitions') return [];
      // Same source selection as C3; its date is exposed, never upgraded to fresh.
      const weight = sources.weights.filter(({ date }) => date <= exposure.date).sort((a, b) =>
        a.date.localeCompare(b.date) || a.updatedAt.localeCompare(b.updatedAt) || a.id.localeCompare(b.id)).at(-1);
      return weight ? [reference('weights', weight, weight.provenance ?? 'legacyUnknown', ['weightKg'])] : [];
    });
    evidence.push({ domain: 'performance', origin: 'c3', interpretation: 'contextOnly', freshness: 'notContracted',
      sourceReferences: canonicalReferences(refs), dependentSourceReferences: canonicalReferences(dependencies),
      reasons: [`exercise:${exercise.exerciseDefinitionId}`, `trend:${exercise.trend}`, ...exercise.reasons] });
  }
  return evidence;
}

/** Assembly over detached rows and existing engines only. No commands, default repository getters or writes. */
export async function assembleObservedStrategyCoherence(input: AssembleObservedStrategyCoherenceInput) {
  const sources = structuredClone(input.sources) as CoachStrategySources;
  const parsed = input.strategyState === undefined ? undefined : coachStrategyStateSchema.safeParse(input.strategyState);
  const profile = sources.userProfile.find(({ id }) => id === LOCAL_USER_PROFILE_ID);
  const user = sources.userSettings.find(({ id }) => id === USER_SETTINGS_ID);
  const device = sources.deviceSettings.find(({ id }) => id === DEVICE_SETTINGS_ID);
  const assembled: ObservedStrategyCoherenceInput = {
    referenceDate: input.referenceDate,
    strategy: parsed ? (parsed.success ? projectActiveStrategy(parsed.data) : { status: 'invalid' }) : { status: 'unavailable' },
    ...(parsed?.success ? { strategyRevision: parsed.data.revision } : {}),
    ...(profile ? { currentObjective: profile.goal } : {}),
    safety: { status: 'unavailable', scope: 'c8CalorieDecreaseOnly' }, evidence: [],
  };
  if (!isValidLocalDate(input.referenceDate)) return resolveObservedStrategyCoherence(assembled);
  if (profile) {
    assembled.safety = { status: 'available', origin: 'immediateC8', scope: 'c8CalorieDecreaseOnly',
      assessment: calculateImmediateCoachSafety({ referenceDate: input.referenceDate, profile,
        checkIns: sources.dailyCheckIns, checkOuts: sources.dailyCheckOuts }) };
  }
  if (profile && user && device && Number.isFinite(input.referenceWeightKg) && input.referenceWeightKg > 0) {
    const sessions = { listAll: async () => sources.workoutSessions,
      listExercises: async (id: string) => sources.workoutSessionExercises.filter(({ sessionId }) => sessionId === id) };
    const analysis = await calculateIntegratedCoachAnalysis({ referenceDate: input.referenceDate, profile,
      referenceWeightKg: input.referenceWeightKg }, {
      settings: { get: async () => composeAppSettings(normalizeUserSettings(user), normalizeDeviceSettings(device)) },
      weight: { listBetween: async (a, b) => between(sources.weights, a, b) },
      food: { listEntriesBetween: async (a, b) => between(sources.foodEntries, a, b),
        listJournalStatusesBetween: async (a, b) => between(sources.dailyJournalStatuses, a, b) },
      targets: { listTargetsBetween: async (a, b) => between(sources.dailyTargets, a, b) },
      steps: { listBetween: async (a, b) => between(sources.dailySteps, a, b) },
      dailyCoaching: { listCheckInsBetween: async (a, b) => between(sources.dailyCheckIns, a, b),
        listCheckOutsBetween: async (a, b) => between(sources.dailyCheckOuts, a, b) },
      activities: { listBetween: async (a, b) => between(sources.activities, a, b) },
      workoutSessions: sessions, weeklyReviews: { listAdjustments: async () => sources.acceptedCalorieAdjustments },
      strengthPerformance: { workoutSessions: sessions,
        strengthSets: { listBySession: async (id) => sources.strengthSets.filter(({ sessionId }) => sessionId === id) },
        strengthExercises: { listAll: async () => sources.exerciseDefinitions }, weight: { listAll: async () => sources.weights } },
    });
    assembled.analysis = analysis;
    assembled.safety = { status: 'available', origin: 'integratedC8', scope: 'c8CalorieDecreaseOnly', assessment: analysis.safetyAssessment };
    assembled.evidence = evidenceFromSources(sources, analysis);
  }
  if (assembled.safety.status === 'available') {
    const { analysisStart } = getDailyCoachAnalysisPeriod(input.referenceDate);
    assembled.evidence = [...assembled.evidence, ...assembled.safety.assessment.concerns.map((concern): StrategyObservationEvidence => {
      const refs = concern.domain === 'acuteContext'
        ? [
          ...sources.dailyCheckIns.filter(({ date }) => date === input.referenceDate)
            .map((row) => reference('dailyCheckIns', row, 'userReported', ['contextFlags'])),
          ...sources.dailyCheckOuts.filter(({ date }) => date === input.referenceDate)
            .map((row) => reference('dailyCheckOuts', row, 'userReported', ['contextFlags'])),
        ]
        : concern.domain === 'eligibility' && profile
          ? [reference('userProfile', { id: profile.id, date: input.referenceDate }, 'profileAtReferenceDate', ['ageInformation'])]
          : assembled.evidence.filter(({ domain }) => domain === concern.domain).flatMap(({ sourceReferences }) => sourceReferences);
      return { domain: concern.domain, origin: 'c8', interpretation: 'existingConcern',
        freshness: concern.domain === 'performance' ? 'notContracted'
          : concern.immediateVeto ? 'referenceDate' : 'canonicalWindow',
        sourceReferences: canonicalReferences(refs.filter(({ date }) => concern.domain === 'performance' || date >= analysisStart)),
        dependentSourceReferences: canonicalReferences(assembled.evidence.filter(({ domain }) => domain === concern.domain)
          .flatMap(({ dependentSourceReferences }) => [...dependentSourceReferences])), reasons: [...concern.reasons] };
    })];
  }
  return resolveObservedStrategyCoherence(assembled);
}
