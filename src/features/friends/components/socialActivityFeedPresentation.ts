import type { SocialActivityCloudFeedCard } from '@/domain/friends/socialActivityCloudFeed';
import type {
  SocialActivityChartPoint,
  SocialActivitySnapshotSummary,
  SocialCardioActivitySnapshotDetail,
  SocialStrengthSetSnapshot,
} from '@/domain/friends/socialActivitySnapshotContract';
import type { ActivityType } from '@/domain/models/activity';
import type { StrengthSetType } from '@/domain/models/strength';
import {
  activityTypeLabels,
  bikeTypeLabels,
  cyclingEnvironmentLabels,
  intensityLabels,
  runningSessionLabels,
  strokeLabels,
  swimmingSessionLabels,
  terrainLabels,
} from '@/features/activities/utils/activityLabels';

export interface SocialActivityMetricPresentation {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly primary?: boolean;
}

export interface SocialActivityChartPresentation {
  readonly title: string;
  readonly description: string;
  readonly metric: 'pace' | 'speed' | 'heartRate' | 'cadence';
  readonly unit: string;
  readonly points: readonly SocialActivityChartPoint[];
  readonly reverseYAxis: boolean;
}

const strengthSetTypeLabels: Record<StrengthSetType, string> = {
  warmup: 'Échauffement',
  working: 'Travail',
  dropSet: 'Dégressive',
  failure: 'Échec',
  other: 'Autre',
};

function formatNumber(value: number, maximumFractionDigits = 1): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits });
}

export function socialActivityLabel(activityType: ActivityType): string {
  return activityTypeLabels[activityType];
}

export function socialActivityOwnerDisplayName(card: SocialActivityCloudFeedCard): string {
  return card.ownerProfile.displayName?.trim() || 'Ami SportPilot';
}

export function formatSocialActivityExactDate(value: string, time?: string): string {
  const date = new Date(`${value}T${time ?? '12:00'}:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(time ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

export function formatSocialActivityRelativeDate(value: string): string {
  const activityDate = new Date(`${value}T12:00:00`);
  if (Number.isNaN(activityDate.getTime())) return value;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const activityStart = new Date(
    activityDate.getFullYear(),
    activityDate.getMonth(),
    activityDate.getDate(),
  ).getTime();
  const dayDifference = Math.round((activityStart - todayStart) / 86_400_000);
  if (dayDifference === 0) return 'Aujourd’hui';
  if (dayDifference === -1) return 'Hier';
  if (dayDifference > -7 && dayDifference < 0) {
    return new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' }).format(dayDifference, 'day');
  }
  return formatSocialActivityExactDate(value);
}

export function formatSocialActivityDuration(minutes: number): string {
  const roundedMinutes = Math.round(minutes);
  if (roundedMinutes < 60) return `${roundedMinutes} min`;
  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;
  return remainingMinutes === 0
    ? `${hours} h`
    : `${hours} h ${String(remainingMinutes).padStart(2, '0')}`;
}

export function formatSocialActivityPace(value: number): string {
  const totalSeconds = Math.round(value * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}'${String(seconds).padStart(2, '0')}"/km`;
}

export function formatSocialActivitySwimPace(value: number): string {
  const totalSeconds = Math.round(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}'${String(seconds).padStart(2, '0')}"/100 m`;
}

export function formatSocialActivityElapsedTime(value: number): string {
  const totalSeconds = Math.max(0, Math.round(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function presentSocialActivitySummary(
  summary: SocialActivitySnapshotSummary,
): readonly SocialActivityMetricPresentation[] {
  return [
    summary.durationMinutes === undefined
      ? undefined
      : { id: 'duration', label: 'Durée', value: formatSocialActivityDuration(summary.durationMinutes), primary: true },
    summary.distanceKm === undefined
      ? undefined
      : { id: 'distance-km', label: 'Distance', value: `${formatNumber(summary.distanceKm, 2)} km`, primary: true },
    summary.distanceMeters === undefined
      ? undefined
      : { id: 'distance-m', label: 'Distance', value: `${formatNumber(summary.distanceMeters, 0)} m`, primary: true },
    summary.paceMinutesPerKm === undefined
      ? undefined
      : { id: 'pace-running', label: 'Allure', value: formatSocialActivityPace(summary.paceMinutesPerKm), primary: true },
    summary.paceSecondsPer100Meters === undefined
      ? undefined
      : { id: 'pace-swimming', label: 'Rythme', value: formatSocialActivitySwimPace(summary.paceSecondsPer100Meters), primary: true },
    summary.speedKph === undefined
      ? undefined
      : { id: 'speed', label: 'Vitesse', value: `${formatNumber(summary.speedKph)} km/h`, primary: true },
    summary.elevationGainMeters === undefined
      ? undefined
      : { id: 'elevation', label: 'Dénivelé', value: `D+ ${formatNumber(summary.elevationGainMeters, 0)} m` },
    summary.caloriesKcal === undefined
      ? undefined
      : { id: 'calories', label: 'Calories', value: `${formatNumber(summary.caloriesKcal, 0)} kcal` },
    summary.averageHeartRateBpm === undefined
      ? undefined
      : { id: 'heart-rate', label: 'Fréquence cardiaque', value: `${formatNumber(summary.averageHeartRateBpm, 0)} bpm` },
    summary.averageCadencePerMinute === undefined
      ? undefined
      : { id: 'cadence', label: 'Cadence', value: `${formatNumber(summary.averageCadencePerMinute, 0)}/min` },
    summary.exerciseCount === undefined
      ? undefined
      : {
          id: 'exercise-count',
          label: 'Exercices',
          value: `${summary.exerciseCount} exercice${summary.exerciseCount > 1 ? 's' : ''}`,
          primary: true,
        },
    summary.volumeKg === undefined
      ? undefined
      : { id: 'volume', label: 'Volume', value: `${formatNumber(summary.volumeKg, 0)} kg`, primary: true },
    summary.intensity === undefined
      ? undefined
      : { id: 'intensity', label: 'Intensité', value: intensityLabels[summary.intensity] },
  ].filter((metric): metric is SocialActivityMetricPresentation => metric !== undefined);
}

function labelFromMap(map: Readonly<Record<string, string>>, value: string | undefined): string | undefined {
  if (!value) return undefined;
  return map[value] ?? value;
}

export function presentSocialCardioTags(
  detail: SocialCardioActivitySnapshotDetail,
  activityType: ActivityType,
): readonly string[] {
  const sessionType = activityType === 'running'
    ? labelFromMap(runningSessionLabels, detail.sessionType)
    : activityType === 'swimming'
      ? labelFromMap(swimmingSessionLabels, detail.sessionType)
      : detail.sessionType;

  return [
    sessionType,
    labelFromMap(terrainLabels, detail.terrainType),
    labelFromMap(strokeLabels, detail.mainStroke),
    detail.poolLengthMeters === undefined ? undefined : `Bassin ${detail.poolLengthMeters} m`,
    labelFromMap(bikeTypeLabels, detail.bikeType),
    labelFromMap(cyclingEnvironmentLabels, detail.environment),
  ].filter((label): label is string => Boolean(label));
}

export function presentSocialStrengthSet(set: SocialStrengthSetSnapshot): {
  readonly main: string;
  readonly secondary: readonly string[];
  readonly type?: string;
} {
  let main: string;
  const repetitions = set.repetitions;

  if (set.loadUnit === 'bodyweight') {
    main = repetitions === undefined
      ? 'Poids du corps'
      : `Poids du corps × ${repetitions}`;
  } else if (set.loadUnit === 'assistedKg') {
    main = set.loadKg === undefined
      ? repetitions === undefined ? 'Série assistée' : `${repetitions} répétitions assistées`
      : repetitions === undefined
        ? `Assistance ${formatNumber(set.loadKg)} kg`
        : `Assistance ${formatNumber(set.loadKg)} kg × ${repetitions}`;
  } else if (set.loadUnit === 'kg' && set.loadKg !== undefined) {
    main = repetitions === undefined
      ? `${formatNumber(set.loadKg)} kg`
      : `${formatNumber(set.loadKg)} kg × ${repetitions}`;
  } else if (set.durationSeconds !== undefined) {
    main = formatSocialActivityElapsedTime(set.durationSeconds);
  } else if (set.distanceMeters !== undefined) {
    main = `${formatNumber(set.distanceMeters, 0)} m`;
  } else if (repetitions !== undefined) {
    main = `${repetitions} répétition${repetitions > 1 ? 's' : ''}`;
  } else {
    main = 'Série terminée';
  }

  return {
    main,
    secondary: [
      set.rpe === undefined ? undefined : `RPE ${formatNumber(set.rpe)}`,
      set.restSeconds === undefined ? undefined : `${formatSocialActivityElapsedTime(set.restSeconds)} de repos`,
    ].filter((value): value is string => Boolean(value)),
    ...(set.type ? { type: strengthSetTypeLabels[set.type] } : {}),
  };
}

export function presentSocialActivityChart(
  detail: SocialCardioActivitySnapshotDetail,
): SocialActivityChartPresentation | undefined {
  if (detail.chart?.points.length) {
    const metadata = {
      pace: {
        title: 'Évolution de l’allure',
        description: 'Allure autorisée au fil de l’activité.',
        unit: 'min/km',
        reverseYAxis: true,
      },
      speed: {
        title: 'Évolution de la vitesse',
        description: 'Vitesse autorisée au fil de l’activité.',
        unit: 'km/h',
        reverseYAxis: false,
      },
      heartRate: {
        title: 'Évolution de la fréquence cardiaque',
        description: 'Fréquence cardiaque autorisée au fil de l’activité.',
        unit: 'bpm',
        reverseYAxis: false,
      },
      cadence: {
        title: 'Évolution de la cadence',
        description: 'Cadence autorisée au fil de l’activité.',
        unit: '/min',
        reverseYAxis: false,
      },
    } as const;
    const selected = metadata[detail.chart.metric];
    return {
      ...selected,
      metric: detail.chart.metric,
      points: detail.chart.points,
    };
  }

  if (detail.paceSeries?.length) {
    return {
      title: 'Évolution de l’allure',
      description: 'Allure autorisée au fil de l’activité.',
      metric: 'pace',
      unit: 'min/km',
      points: detail.paceSeries.map((point) => ({
        elapsedSeconds: point.elapsedSeconds,
        value: point.paceMinutesPerKm,
      })),
      reverseYAxis: true,
    };
  }

  return undefined;
}

export function formatSocialActivityChartValue(
  metric: SocialActivityChartPresentation['metric'],
  value: number,
): string {
  if (metric === 'pace') return formatSocialActivityPace(value);
  if (metric === 'speed') return `${formatNumber(value)} km/h`;
  if (metric === 'heartRate') return `${formatNumber(value, 0)} bpm`;
  return `${formatNumber(value, 0)}/min`;
}
