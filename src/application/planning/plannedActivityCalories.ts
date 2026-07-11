import { PLANNED_ACTIVITY_CALCULATION_VERSION } from '@/domain/calculations/constants';
import { calculateNetMetCalories } from '@/domain/calculations/met';
import { calculateRunningCalories } from '@/domain/calculations/running';
import type { Activity, ActivityIntensity } from '@/domain/models/activity';
import type { LocalDate } from '@/domain/models/common';
import type { PlannedActivityCalorieSnapshot } from '@/domain/models/plannedActivity';
import type { AppSettings } from '@/domain/models/settings';
import type { StrengthSessionStyle, WorkoutSession } from '@/domain/models/strength';
import type { PlannedEnduranceSession } from '@/domain/planning/endurancePlanningState';

const STRENGTH_STYLE_MET: Readonly<Record<StrengthSessionStyle, number>> = {
  classic: 3.5,
  strength: 5,
  circuit: 5.8,
  veryIntense: 6,
};

const INTENSITY_FACTOR: Readonly<Record<ActivityIntensity, number>> = {
  low: 0.75,
  moderate: 1,
  high: 1.25,
};

export const strengthSessionStyleLabels: Readonly<Record<StrengthSessionStyle, string>> = {
  classic: 'Classique / hypertrophie',
  strength: 'Force / mouvements lourds',
  circuit: 'Circuit / supersets denses',
  veryIntense: 'Très intense',
};

export function strengthSessionMet(style: StrengthSessionStyle = 'classic'): number {
  return STRENGTH_STYLE_MET[style];
}

function adjustedMet(baseMet: number, intensity: ActivityIntensity): number {
  return Math.max(1, baseMet * INTENSITY_FACTOR[intensity]);
}

function enduranceMet(
  session: PlannedEnduranceSession,
  settings: AppSettings,
): number {
  switch (session.activityType) {
    case 'running':
      return adjustedMet(8.3, session.intensity);
    case 'swimming':
      if (session.intensity === 'low') return settings.swimmingMetValues.recovery;
      if (session.intensity === 'high') return settings.swimmingMetValues.intervals;
      return settings.swimmingMetValues.endurance;
    case 'cycling':
      return adjustedMet(settings.defaultCyclingMet, session.intensity);
    case 'walking':
      return adjustedMet(settings.defaultWalkingMet, session.intensity);
    case 'otherCardio':
      return adjustedMet(settings.defaultOtherCardioMet, session.intensity);
  }
}

export function estimateStrengthSessionPlannedProjection(
  session: WorkoutSession,
  date: LocalDate,
  weightKg: number,
): PlannedActivityCalorieSnapshot | undefined {
  const durationMinutes = session.plannedDurationMinutes ?? (
    session.status === 'planned' || session.status === 'inProgress'
      ? session.durationMinutes
      : undefined
  );

  if (!durationMinutes || durationMinutes <= 0) {
    return undefined;
  }

  const metUsed = strengthSessionMet(session.strengthSessionStyle ?? 'classic');

  return {
    id: `strengthSession:${session.id}`,
    source: 'strengthSession',
    sourceId: session.id,
    title: session.sourceTemplateNameSnapshot ?? 'Séance de musculation',
    date,
    activityType: 'strengthTraining',
    estimatedCaloriesKcal: calculateNetMetCalories(
      durationMinutes,
      metUsed,
      weightKg,
    ),
    weightKg,
    calculationVersion: PLANNED_ACTIVITY_CALCULATION_VERSION,
    basis: 'plannedDuration',
    durationMinutes,
    metUsed,
  };
}

function strengthProjection(
  session: WorkoutSession,
  date: LocalDate,
  weightKg: number,
): PlannedActivityCalorieSnapshot | undefined {
  if (
    session.status === 'abandoned' ||
    session.status === 'skipped' ||
    session.completedActivityId !== undefined
  ) {
    return undefined;
  }

  if (session.status === 'completed' && session.durationMinutes) {
    const metUsed = strengthSessionMet(session.strengthSessionStyle ?? 'classic');
    return {
      id: `strengthSession:${session.id}`,
      source: 'strengthSession',
      sourceId: session.id,
      title: session.sourceTemplateNameSnapshot ?? 'Séance de musculation',
      date,
      activityType: 'strengthTraining',
      estimatedCaloriesKcal: calculateNetMetCalories(
        session.durationMinutes,
        metUsed,
        weightKg,
      ),
      weightKg,
      calculationVersion: PLANNED_ACTIVITY_CALCULATION_VERSION,
      basis: 'actualDuration',
      durationMinutes: session.durationMinutes,
      metUsed,
    };
  }

  return estimateStrengthSessionPlannedProjection(session, date, weightKg);
}

export function estimateEnduranceSessionPlannedProjection(
  session: PlannedEnduranceSession,
  weightKg: number,
  settings: AppSettings,
): PlannedActivityCalorieSnapshot | undefined {
  if (
    session.activityType === 'running' &&
    session.targetDistanceKm !== undefined &&
    session.targetDistanceKm > 0
  ) {
    return {
      id: `endurancePlanning:${session.id}`,
      source: 'endurancePlanning',
      sourceId: session.id,
      title: session.title,
      date: session.date,
      activityType: session.activityType,
      estimatedCaloriesKcal: calculateRunningCalories(
        weightKg,
        session.targetDistanceKm,
        settings.runningKcalPerKgPerKm,
      ),
      weightKg,
      calculationVersion: PLANNED_ACTIVITY_CALCULATION_VERSION,
      basis: 'plannedDistance',
      coefficientUsed: settings.runningKcalPerKgPerKm,
      ...(session.targetDurationMinutes === undefined
        ? {}
        : { durationMinutes: session.targetDurationMinutes }),
    };
  }

  if (
    session.targetDurationMinutes === undefined ||
    session.targetDurationMinutes <= 0
  ) {
    return undefined;
  }

  const metUsed = enduranceMet(session, settings);

  return {
    id: `endurancePlanning:${session.id}`,
    source: 'endurancePlanning',
    sourceId: session.id,
    title: session.title,
    date: session.date,
    activityType: session.activityType,
    estimatedCaloriesKcal: calculateNetMetCalories(
      session.targetDurationMinutes,
      metUsed,
      weightKg,
    ),
    weightKg,
    calculationVersion: PLANNED_ACTIVITY_CALCULATION_VERSION,
    basis: 'plannedDuration',
    durationMinutes: session.targetDurationMinutes,
    metUsed,
  };
}

function enduranceProjection(
  session: PlannedEnduranceSession,
  weightKg: number,
  settings: AppSettings,
): PlannedActivityCalorieSnapshot | undefined {
  if (session.status !== 'planned' || session.completedActivityId !== undefined) {
    return undefined;
  }

  return estimateEnduranceSessionPlannedProjection(session, weightKg, settings);
}

export interface BuildPlannedActivityCaloriesInput {
  date: LocalDate;
  weightKg: number;
  settings: AppSettings;
  activities: readonly Activity[];
  strengthSessions: readonly WorkoutSession[];
  enduranceSessions: readonly PlannedEnduranceSession[];
}

export function buildPlannedActivityCalories({
  date,
  weightKg,
  settings,
  activities,
  strengthSessions,
  enduranceSessions,
}: BuildPlannedActivityCaloriesInput): PlannedActivityCalorieSnapshot[] {
  const projections: PlannedActivityCalorieSnapshot[] = [];

  const strengthCandidates = strengthSessions
    .filter((session) => {
      const effectiveDate = session.status === 'planned'
        ? session.plannedDate ?? session.date
        : session.date;
      return effectiveDate === date;
    })
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  for (const session of strengthCandidates) {
    const projection = strengthProjection(session, date, weightKg);
    if (!projection) continue;

    if (activities.some((activity) =>
      activity.plannedActivity?.source === 'strengthSession' &&
      activity.plannedActivity.sourceId === session.id
    )) {
      continue;
    }

    projections.push(projection);
  }

  const enduranceCandidates = enduranceSessions
    .filter((session) => session.date === date)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  for (const session of enduranceCandidates) {
    const projection = enduranceProjection(session, weightKg, settings);
    if (!projection) continue;

    if (activities.some((activity) =>
      activity.plannedActivity?.source === 'endurancePlanning' &&
      activity.plannedActivity.sourceId === session.id
    )) {
      continue;
    }

    projections.push(projection);
  }

  return projections;
}

export function totalPlannedActivityCalories(
  projections: readonly PlannedActivityCalorieSnapshot[],
): number {
  return projections.reduce(
    (total, projection) => total + projection.estimatedCaloriesKcal,
    0,
  );
}
