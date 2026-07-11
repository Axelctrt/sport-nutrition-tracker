import {
  estimateEnduranceSessionPlannedProjection,
  estimateStrengthSessionPlannedProjection,
} from '@/application/planning/plannedActivityCalories';
import type { DailyTargetCalculationResult } from '@/domain/calculations/dailyTarget';
import { getEffectiveActivityCalories } from '@/domain/calculations/activityCalories';
import { roundCalories } from '@/domain/calculations/rounding';
import type { Activity, ActivityType } from '@/domain/models/activity';
import type { LocalDate } from '@/domain/models/common';
import type {
  PlannedActivityCalorieSnapshot,
  PlannedActivityReference,
} from '@/domain/models/plannedActivity';
import type { AppSettings } from '@/domain/models/settings';
import type { WorkoutSession } from '@/domain/models/strength';
import type { PlannedEnduranceSession } from '@/domain/planning/endurancePlanningState';

export type DailySportEnergyItemStatus =
  | 'planned'
  | 'realizedPlanned'
  | 'unplanned'
  | 'includedInSteps';

export type DailySportEnergyCalculationSource = 'automatic' | 'manual';

export interface DailySportEnergyItem {
  id: string;
  title: string;
  activityType: ActivityType;
  status: DailySportEnergyItemStatus;
  calculationSource: DailySportEnergyCalculationSource;
  caloriesKcal: number;
  plannedCaloriesKcal?: number;
  deltaCaloriesKcal?: number;
  detail: string;
}

export interface DailyEnergyTransparency {
  expenditureWithoutSportKcal: number;
  targetBeforeSportKcal: number;
  plannedSportCaloriesKcal: number;
  actualSportCaloriesKcal: number;
  rawSportCaloriesKcal: number;
  targetSportImpactKcal: number;
  currentTargetKcal: number;
  floorLimitedSportImpact: boolean;
  items: DailySportEnergyItem[];
}

export interface BuildDailyEnergyTransparencyInput {
  date: LocalDate;
  calculation: DailyTargetCalculationResult;
  activities: readonly Activity[];
  plannedActivities: readonly PlannedActivityCalorieSnapshot[];
  strengthSessions: readonly WorkoutSession[];
  enduranceSessions: readonly PlannedEnduranceSession[];
  settings: AppSettings;
  weightKg: number;
}

const activityTypeLabels: Readonly<Record<ActivityType, string>> = {
  running: 'Course',
  swimming: 'Natation',
  strengthTraining: 'Musculation',
  cycling: 'Vélo',
  walking: 'Marche',
  otherCardio: 'Autre cardio',
};

function activityContribution(activity: Activity): number {
  if (activity.type === 'walking' && activity.includedInDailySteps) {
    return 0;
  }

  return getEffectiveActivityCalories(activity);
}

function sourceProjection(
  reference: PlannedActivityReference | undefined,
  date: LocalDate,
  strengthSessions: readonly WorkoutSession[],
  enduranceSessions: readonly PlannedEnduranceSession[],
  settings: AppSettings,
  weightKg: number,
): PlannedActivityCalorieSnapshot | undefined {
  if (!reference) return undefined;

  if (reference.source === 'strengthSession') {
    const session = strengthSessions.find(
      (candidate) => candidate.id === reference.sourceId,
    );
    if (!session || (session.plannedDate ?? session.date) !== date) return undefined;

    return estimateStrengthSessionPlannedProjection(
      session,
      session.plannedDate ?? session.date,
      weightKg,
    );
  }

  const session = enduranceSessions.find(
    (candidate) => candidate.id === reference.sourceId,
  );
  return session && session.date === date
    ? estimateEnduranceSessionPlannedProjection(session, weightKg, settings)
    : undefined;
}

function sourceTitle(
  reference: PlannedActivityReference | undefined,
  strengthSessions: readonly WorkoutSession[],
  enduranceSessions: readonly PlannedEnduranceSession[],
): string | undefined {
  if (!reference) return undefined;

  if (reference.source === 'strengthSession') {
    const session = strengthSessions.find(
      (candidate) => candidate.id === reference.sourceId,
    );
    return session?.sourceTemplateNameSnapshot;
  }

  return enduranceSessions.find(
    (candidate) => candidate.id === reference.sourceId,
  )?.title;
}

function linkedActualItem(
  activity: Activity,
  date: LocalDate,
  strengthSessions: readonly WorkoutSession[],
  enduranceSessions: readonly PlannedEnduranceSession[],
  settings: AppSettings,
  weightKg: number,
): DailySportEnergyItem {
  const caloriesKcal = activityContribution(activity);
  const planned = sourceProjection(
    activity.plannedActivity,
    date,
    strengthSessions,
    enduranceSessions,
    settings,
    weightKg,
  );
  const plannedCaloriesKcal = planned?.estimatedCaloriesKcal;
  const title = sourceTitle(
    activity.plannedActivity,
    strengthSessions,
    enduranceSessions,
  ) ?? activityTypeLabels[activity.type];

  if (activity.type === 'walking' && activity.includedInDailySteps) {
    return {
      id: `activity:${activity.id}`,
      title,
      activityType: activity.type,
      status: 'includedInSteps',
      calculationSource: activity.manualCaloriesKcal === undefined
        ? 'automatic'
        : 'manual',
      caloriesKcal: 0,
      ...(plannedCaloriesKcal === undefined ? {} : { plannedCaloriesKcal }),
      detail: 'Déjà incluse dans les pas de la journée',
    };
  }

  return {
    id: `activity:${activity.id}`,
    title,
    activityType: activity.type,
    status: 'realizedPlanned',
    calculationSource: activity.manualCaloriesKcal === undefined
      ? 'automatic'
      : 'manual',
    caloriesKcal,
    ...(plannedCaloriesKcal === undefined
      ? {}
      : {
          plannedCaloriesKcal,
          deltaCaloriesKcal: caloriesKcal - plannedCaloriesKcal,
        }),
    detail: activity.manualCaloriesKcal === undefined
      ? 'Dépense réelle estimée automatiquement'
      : 'Calories réelles saisies manuellement',
  };
}

function unplannedActualItem(activity: Activity): DailySportEnergyItem {
  const caloriesKcal = activityContribution(activity);

  if (activity.type === 'walking' && activity.includedInDailySteps) {
    return {
      id: `activity:${activity.id}`,
      title: activityTypeLabels[activity.type],
      activityType: activity.type,
      status: 'includedInSteps',
      calculationSource: activity.manualCaloriesKcal === undefined
        ? 'automatic'
        : 'manual',
      caloriesKcal: 0,
      detail: 'Déjà incluse dans les pas de la journée',
    };
  }

  return {
    id: `activity:${activity.id}`,
    title: activityTypeLabels[activity.type],
    activityType: activity.type,
    status: 'unplanned',
    calculationSource: activity.manualCaloriesKcal === undefined
      ? 'automatic'
      : 'manual',
    caloriesKcal,
    detail: activity.manualCaloriesKcal === undefined
      ? 'Activité imprévue estimée automatiquement'
      : 'Activité imprévue saisie manuellement',
  };
}

function projectedItem(
  projection: PlannedActivityCalorieSnapshot,
  date: LocalDate,
  strengthSessions: readonly WorkoutSession[],
  enduranceSessions: readonly PlannedEnduranceSession[],
  settings: AppSettings,
  weightKg: number,
): DailySportEnergyItem {
  if (projection.basis !== 'actualDuration') {
    return {
      id: projection.id,
      title: projection.title,
      activityType: projection.activityType,
      status: 'planned',
      calculationSource: 'automatic',
      caloriesKcal: projection.estimatedCaloriesKcal,
      detail: projection.basis === 'plannedDistance'
        ? 'Estimation planifiée selon la distance'
        : 'Estimation planifiée selon la durée',
    };
  }

  const reference: PlannedActivityReference = {
    source: projection.source,
    sourceId: projection.sourceId,
  };
  const planned = sourceProjection(
    reference,
    date,
    strengthSessions,
    enduranceSessions,
    settings,
    weightKg,
  );
  const plannedCaloriesKcal = planned?.estimatedCaloriesKcal;

  return {
    id: projection.id,
    title: projection.title,
    activityType: projection.activityType,
    status: 'realizedPlanned',
    calculationSource: 'automatic',
    caloriesKcal: projection.estimatedCaloriesKcal,
    ...(plannedCaloriesKcal === undefined
      ? {}
      : {
          plannedCaloriesKcal,
          deltaCaloriesKcal:
            projection.estimatedCaloriesKcal - plannedCaloriesKcal,
        }),
    detail: 'Durée réelle de la séance détaillée',
  };
}

export function buildDailyEnergyTransparency({
  date,
  calculation,
  activities,
  plannedActivities,
  strengthSessions,
  enduranceSessions,
  settings,
  weightKg,
}: BuildDailyEnergyTransparencyInput): DailyEnergyTransparency {
  const activityItems = activities.map((activity) => (
    activity.plannedActivity
      ? linkedActualItem(
          activity,
          date,
          strengthSessions,
          enduranceSessions,
          settings,
          weightKg,
        )
      : unplannedActualItem(activity)
  ));
  const projectionItems = plannedActivities.map((projection) => (
    projectedItem(
      projection,
      date,
      strengthSessions,
      enduranceSessions,
      settings,
      weightKg,
    )
  ));
  const items = [...projectionItems, ...activityItems];
  const plannedSportCaloriesKcal = items
    .filter((item) => item.status === 'planned')
    .reduce((total, item) => total + item.caloriesKcal, 0);
  const actualSportCaloriesKcal = items
    .filter((item) => (
      item.status === 'realizedPlanned' || item.status === 'unplanned'
    ))
    .reduce((total, item) => total + item.caloriesKcal, 0);
  const rawSportCaloriesKcal = plannedSportCaloriesKcal
    + actualSportCaloriesKcal;
  const expenditureWithoutSportKcal = Math.max(
    0,
    calculation.energy.totalEstimatedExpenditureKcal - rawSportCaloriesKcal,
  );
  const targetBeforeSportRawKcal = expenditureWithoutSportKcal
    + calculation.goalAdjustmentKcal
    + calculation.acceptedCalibrationAdjustmentKcal;
  const targetBeforeSportKcal = Math.max(
    roundCalories(targetBeforeSportRawKcal),
    calculation.calorieFloorKcal,
  );
  const targetSportImpactKcal = Math.max(
    0,
    calculation.targetCaloriesKcal - targetBeforeSportKcal,
  );

  return {
    expenditureWithoutSportKcal,
    targetBeforeSportKcal,
    plannedSportCaloriesKcal,
    actualSportCaloriesKcal,
    rawSportCaloriesKcal,
    targetSportImpactKcal,
    currentTargetKcal: calculation.targetCaloriesKcal,
    floorLimitedSportImpact:
      rawSportCaloriesKcal > targetSportImpactKcal + 5,
    items,
  };
}
