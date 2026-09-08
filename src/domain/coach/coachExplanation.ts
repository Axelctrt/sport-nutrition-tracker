import type { CoachDecisionMemoryRecord } from '@/domain/coach/coachMemory';
import {
  COACH_REVIEW_ACTION_LABELS,
  COACH_REVIEW_CONFIDENCE_LABELS,
  COACH_REVIEW_STATE_LABELS,
  type CoachReviewSnapshot,
} from '@/domain/coach/coachReview';
import type {
  CoachSafetyAssessment,
  CoachSafetyStatus,
} from '@/domain/coach/coachSafety';
import type {
  CoachNextReview,
  CoachStateConfidenceLevel,
} from '@/domain/coach/coachState';

export type CoachExplanationAvailability =
  | 'available'
  | 'insufficientData'
  | 'unavailable';

export interface CoachExplanationComparison {
  status: 'firstDecision' | 'changed' | 'unchanged' | 'unavailable';
  summary: string;
  changes: string[];
}

export interface CoachExplanationSafety {
  status: Exclude<CoachSafetyStatus, 'clear'>;
  title: string;
  reasons: string[];
}

export interface CoachExplanation {
  availability: CoachExplanationAvailability;
  title: string;
  summary: string;
  confidence?: {
    level: CoachStateConfidenceLevel;
    label: string;
  };
  reasons: string[];
  blockingFactors: string[];
  watchPoints: string[];
  comparison: CoachExplanationComparison;
  safety?: CoachExplanationSafety;
  nextReview?: CoachNextReview;
}

export interface BuildCoachExplanationInput {
  currentReview?: CoachReviewSnapshot;
  safetyAssessment?: CoachSafetyAssessment;
  memories: readonly CoachDecisionMemoryRecord[];
}

const SAFETY_COMPARISON_LABELS: Record<CoachSafetyStatus, string> = {
  clear: 'Aucun blocage Safety',
  caution: 'Signal à surveiller',
  doNotIntensify: 'Pas d’intensification',
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function samePeriod(
  memory: CoachDecisionMemoryRecord,
  review: CoachReviewSnapshot,
): boolean {
  return memory.period.weekStart === review.period.weekStart
    && memory.period.weekEnd === review.period.weekEnd;
}

function sortedMemories(
  memories: readonly CoachDecisionMemoryRecord[],
): CoachDecisionMemoryRecord[] {
  return [...memories].sort((left, right) => (
    right.decisionDate.localeCompare(left.decisionDate)
    || right.decidedAt.localeCompare(left.decidedAt)
    || right.id.localeCompare(left.id)
  ));
}

function comparison(
  currentReview: CoachReviewSnapshot | undefined,
  memories: readonly CoachDecisionMemoryRecord[],
  currentSafetyStatus: CoachSafetyStatus | undefined,
): CoachExplanationComparison {
  if (!currentReview) {
    return {
      status: 'unavailable',
      summary: 'Aucune comparaison fiable n’est possible tant que la décision actuelle n’est pas disponible.',
      changes: [],
    };
  }

  const ordered = sortedMemories(memories);
  const latest = ordered[0];
  const reference = latest && samePeriod(latest, currentReview)
    ? ordered.find((memory) => !samePeriod(memory, currentReview))
    : latest;

  if (!reference) {
    return {
      status: 'firstDecision',
      summary: 'C’est la première décision enregistrée : aucune comparaison historique n’est disponible.',
      changes: [],
    };
  }

  const changes: string[] = [];
  if (reference.primaryAction !== currentReview.plan.action) {
    changes.push(
      `Action principale : ${COACH_REVIEW_ACTION_LABELS[reference.primaryAction]} → ${currentReview.plan.label}.`,
    );
  }
  if (reference.coachState !== currentReview.diagnostic.state) {
    changes.push(
      `État Coach : ${COACH_REVIEW_STATE_LABELS[reference.coachState]} → ${currentReview.diagnostic.label}.`,
    );
  }
  if (reference.confidence.level !== currentReview.confidence.level) {
    changes.push(
      `Confiance : ${COACH_REVIEW_CONFIDENCE_LABELS[reference.confidence.level]} → ${COACH_REVIEW_CONFIDENCE_LABELS[currentReview.confidence.level]}.`,
    );
  }
  const effectiveSafetyStatus = currentSafetyStatus ?? currentReview.safetyAssessment.status;
  if (reference.safety.status !== effectiveSafetyStatus) {
    changes.push(
      `Safety : ${SAFETY_COMPARISON_LABELS[reference.safety.status]} → ${SAFETY_COMPARISON_LABELS[effectiveSafetyStatus]}.`,
    );
  }

  return changes.length > 0
    ? {
        status: 'changed',
        summary: 'Les changements ci-dessous proviennent de la comparaison avec la dernière décision fiable.',
        changes,
      }
    : {
        status: 'unchanged',
        summary: 'La décision structurée reste identique à la dernière décision comparable.',
        changes: [],
      };
}

function safetyExplanation(
  assessment: CoachSafetyAssessment | undefined,
): CoachExplanationSafety | undefined {
  if (!assessment || assessment.status === 'clear') return undefined;
  return {
    status: assessment.status,
    title: assessment.status === 'doNotIntensify'
      ? 'Pas d’intensification pour le moment.'
      : 'Un signal mérite d’être surveillé.',
    reasons: unique(assessment.reasons),
  };
}

export function buildCoachExplanation({
  currentReview,
  safetyAssessment,
  memories,
}: BuildCoachExplanationInput): CoachExplanation {
  const effectiveSafety = safetyAssessment ?? currentReview?.safetyAssessment;
  const currentComparison = comparison(
    currentReview,
    memories,
    effectiveSafety?.status,
  );
  const safety = safetyExplanation(effectiveSafety);

  if (!currentReview) {
    return {
      availability: 'unavailable',
      title: 'Décision indisponible',
      summary: 'Le Coach manque d’éléments fiables pour expliquer une décision actuelle.',
      reasons: [],
      blockingFactors: [],
      watchPoints: [],
      comparison: currentComparison,
      ...(safety ? { safety } : {}),
    };
  }

  const insufficientData = currentReview.plan.action === 'collectMoreData'
    || currentReview.diagnostic.state === 'insufficientData'
    || currentReview.confidence.level === 'insufficient';
  const reasons = unique(currentReview.primaryReasons);
  const blockingFactors = unique(currentReview.blockingFactors);
  const watchPoints = unique(currentReview.primaryReasons.slice(1));

  return {
    availability: insufficientData ? 'insufficientData' : 'available',
    title: currentReview.plan.label,
    summary: insufficientData
      ? 'Le Coach manque encore d’éléments fiables pour expliquer une décision plus précise.'
      : `${currentReview.plan.label} · ${currentReview.diagnostic.label}`,
    confidence: {
      level: currentReview.confidence.level,
      label: COACH_REVIEW_CONFIDENCE_LABELS[currentReview.confidence.level],
    },
    reasons,
    blockingFactors,
    watchPoints,
    comparison: currentComparison,
    ...(safety ? { safety } : {}),
    nextReview: { ...currentReview.nextReview },
  };
}
