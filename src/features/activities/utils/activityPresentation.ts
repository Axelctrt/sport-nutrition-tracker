import { getEffectiveActivityCalories } from '@/domain/calculations/activityCalories';
import { calculateRunningPaceSecondsPerKm, calculateRunningSteps, formatPace } from '@/domain/calculations/running';
import { calculateSwimmingPaceSecondsPer100Meters } from '@/domain/calculations/swimming';
import type { Activity } from '@/domain/models/activity';
import {
  activityTypeLabels,
  runningSessionLabels,
  strokeLabels,
  swimmingSessionLabels,
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
        ...commonMetrics,
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
