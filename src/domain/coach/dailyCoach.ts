import type {
  CoachPriority,
  CoachState,
  CoachStateConfidence,
  CoachStateResult,
} from '@/domain/coach/coachState';
import type { CoachSignalEvidence } from '@/domain/coach/coachSignalEvidence';
import type { CoachStateObservation } from '@/domain/coach/coachStateObservations';

export type DailyCoachVerdict =
  | 'insufficientData'
  | 'planMaintained'
  | 'recoveryToWatch'
  | 'temporaryVariation'
  | 'attentionRequired';

export interface DailyCoachResult {
  verdict: DailyCoachVerdict;
  title: string;
  message: string;
  priority: CoachPriority;
  coachState: CoachState;
  confidence: CoachStateConfidence;
}

export interface ProjectDailyCoachInput {
  coachStateResult: CoachStateResult;
  todayObservation?: CoachStateObservation;
}

interface DailyCoachCopy {
  verdict: DailyCoachVerdict;
  title: string;
  message: string;
}

const STATE_COPY: Record<CoachState, DailyCoachCopy> = {
  insufficientData: {
    verdict: 'insufficientData',
    title: 'Données encore insuffisantes',
    message: 'Le Coach attend davantage de données avant d’interpréter la tendance.',
  },
  insufficientFoodTracking: {
    verdict: 'insufficientData',
    title: 'Suivi à compléter',
    message: 'Le suivi alimentaire reste trop incomplet pour interpréter correctement la tendance.',
  },
  onTrack: {
    verdict: 'planMaintained',
    title: 'Plan maintenu',
    message: 'Les signaux restent cohérents : aucun changement n’est nécessaire aujourd’hui.',
  },
  possibleRecomposition: {
    verdict: 'planMaintained',
    title: 'Plan maintenu',
    message: 'Les signaux restent compatibles avec une recomposition probable, sans raison de modifier le plan aujourd’hui.',
  },
  temporaryWaterVariation: {
    verdict: 'temporaryVariation',
    title: 'Variation temporaire probable',
    message: 'Le contexte peut expliquer cette variation : observe la tendance avant de réagir.',
  },
  degradedRecovery: {
    verdict: 'attentionRequired',
    title: 'Récupération à prioriser',
    message: 'Les signaux longitudinaux invitent à prioriser la récupération sans modifier automatiquement le plan.',
  },
  conflictingSignals: {
    verdict: 'attentionRequired',
    title: 'Tendance à surveiller',
    message: 'Les signaux évoluent dans des directions différentes et méritent d’être suivis.',
  },
  truePlateau: {
    verdict: 'attentionRequired',
    title: 'Tendance à surveiller',
    message: 'La tendance reste éloignée de l’objectif et mérite une réévaluation humaine.',
  },
  targetTooHigh: {
    verdict: 'attentionRequired',
    title: 'Rythme à réévaluer',
    message: 'La tendance suggère de réexaminer le rythme visé, sans changement automatique.',
  },
  targetTooLow: {
    verdict: 'attentionRequired',
    title: 'Rythme à réévaluer',
    message: 'La tendance suggère de réexaminer le rythme visé, sans changement automatique.',
  },
  excessiveLoss: {
    verdict: 'attentionRequired',
    title: 'Rythme à réévaluer',
    message: 'La perte observée est plus rapide que prévu et mérite de l’attention.',
  },
  excessiveGain: {
    verdict: 'attentionRequired',
    title: 'Rythme à réévaluer',
    message: 'La prise observée est plus rapide que prévu et mérite de l’attention.',
  },
  activityBelowExpected: {
    verdict: 'attentionRequired',
    title: 'Activité à revoir',
    message: 'L’activité récente reste sous les attentes et mérite d’être examinée.',
  },
};

function isConfirmedConcern<T>(
  evidence: CoachSignalEvidence<T> | undefined,
  concernValue: T,
): boolean {
  return evidence?.provenance === 'userReported'
    && evidence.confidence === 'confirmed'
    && evidence.value === concernValue;
}

export function hasConfirmedDailyRecoveryConcern(
  observation: CoachStateObservation | undefined,
): boolean {
  if (!observation) return false;
  return isConfirmedConcern(observation.readiness, 'low')
    || isConfirmedConcern(observation.sleepQuality, 'poor')
    || isConfirmedConcern(observation.hunger, 'high')
    || isConfirmedConcern(observation.energy, 'low');
}

function baseProjection(coachStateResult: CoachStateResult): DailyCoachResult {
  return {
    ...STATE_COPY[coachStateResult.state],
    priority: coachStateResult.priority,
    coachState: coachStateResult.state,
    confidence: coachStateResult.confidence,
  };
}

export function projectDailyCoach({
  coachStateResult,
  todayObservation,
}: ProjectDailyCoachInput): DailyCoachResult {
  const projection = baseProjection(coachStateResult);

  if (
    coachStateResult.priority === 'high'
    || coachStateResult.state === 'degradedRecovery'
    || coachStateResult.state === 'temporaryWaterVariation'
    || !hasConfirmedDailyRecoveryConcern(todayObservation)
  ) {
    return projection;
  }

  return {
    verdict: 'recoveryToWatch',
    title: 'Récupération à surveiller',
    message: 'Un signal du jour mérite d’être surveillé, sans modifier le plan sur cette seule observation.',
    priority: coachStateResult.priority === 'medium' ? 'medium' : 'low',
    coachState: coachStateResult.state,
    confidence: coachStateResult.confidence,
  };
}
