import { getEffectiveActivityCalories } from '@/domain/calculations/activityCalories';
import { calculateRunningPaceSecondsPerKm, calculateRunningSteps, formatPace } from '@/domain/calculations/running';
import { calculateSwimmingPaceSecondsPer100Meters } from '@/domain/calculations/swimming';
import { calculateAverageSpeedKmh, calculatePoolLengths } from '@/domain/calculations/endurance';
import type { Activity } from '@/domain/models/activity';
import {
  activityTypeLabels,
  bikeTypeLabels,
  cyclingEnvironmentLabels,
  runningSessionLabels,
  strokeLabels,
  swimmingSessionLabels,
  terrainLabels,
} from '@/features/activities/utils/activityLabels';

export interface ActivityPresentation {
  title: string;
  subtitle: string;
  metrics: string[];
  caloriesKcal: number;
  usesManualCalories: boolean;
}

export function presentActivity(activity: Activity): ActivityPresentation {
  const commonMetrics = [
    `${activity.durationMinutes.toLocaleString('fr-FR')} min`,
  ];

  if (activity.type === 'running') {
    return {
      title: runningSessionLabels[activity.sessionType],
      subtitle: activityTypeLabels.running,
      metrics: [
        `${activity.distanceKm.toLocaleString('fr-FR')} km`,
        formatPace(calculateRunningPaceSecondsPerKm(activity.durationMinutes, activity.distanceKm)) + ' min/km',
        `${calculateRunningSteps(activity.durationMinutes, activity.averageCadenceSpm).toLocaleString('fr-FR')} pas`,
        ...(activity.elevationGainMeters === undefined ? [] : [`D+ ${activity.elevationGainMeters.toLocaleString('fr-FR')} m`]),
        ...(activity.terrainType === undefined ? [] : [terrainLabels[activity.terrainType]]),
        ...commonMetrics,
      ],
      caloriesKcal: getEffectiveActivityCalories(activity),
      usesManualCalories: activity.manualCaloriesKcal !== undefined,
    };
  }

  if (activity.type === 'swimming') {
    return {
      title: swimmingSessionLabels[activity.sessionType],
      subtitle: `${activityTypeLabels.swimming} · ${strokeLabels[activity.mainStroke]}`,
      metrics: [
        `${activity.distanceMeters.toLocaleString('fr-FR')} m`,
        formatPace(calculateSwimmingPaceSecondsPer100Meters(activity.durationMinutes, activity.distanceMeters)) + ' min/100 m',
        ...(calculatePoolLengths(activity.distanceMeters, activity.poolLengthMeters) === undefined
          ? []
          : [`${calculatePoolLengths(activity.distanceMeters, activity.poolLengthMeters)?.toLocaleString('fr-FR')} longueurs`]),
        ...commonMetrics,
      ],
      caloriesKcal: getEffectiveActivityCalories(activity),
      usesManualCalories: activity.manualCaloriesKcal !== undefined,
    };
  }

  if (activity.type === 'cycling') {
    return {
      title: activityTypeLabels.cycling,
      subtitle: `${bikeTypeLabels[activity.bikeType ?? 'other']} · ${cyclingEnvironmentLabels[activity.environment ?? 'outdoor']}`,
      metrics: [
        ...(activity.distanceKm === undefined ? [] : [
          `${activity.distanceKm.toLocaleString('fr-FR')} km`,
          `${calculateAverageSpeedKmh(activity.durationMinutes, activity.distanceKm).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h`,
        ]),
        ...(activity.elevationGainMeters === undefined ? [] : [`D+ ${activity.elevationGainMeters.toLocaleString('fr-FR')} m`]),
        ...commonMetrics,
        `${activity.met.toLocaleString('fr-FR')} MET`,
      ],
      caloriesKcal: getEffectiveActivityCalories(activity),
      usesManualCalories: activity.manualCaloriesKcal !== undefined,
    };
  }

  const metrics = [...commonMetrics, `${activity.met.toLocaleString('fr-FR')} MET`];
  if (activity.type === 'walking' && activity.includedInDailySteps) {
    metrics.push('Comprise dans les pas');
  }

  return {
    title: activityTypeLabels[activity.type],
    subtitle: activityTypeLabels[activity.type],
    metrics,
    caloriesKcal: getEffectiveActivityCalories(activity),
    usesManualCalories: activity.manualCaloriesKcal !== undefined,
  };
}
