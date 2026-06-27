import type {
  Activity,
  ActivityType,
  CyclingActivity,
  EnduranceTemplate,
  OtherActivity,
  RunningActivity,
  StrengthTrainingActivity,
  SwimmingActivity,
} from '@/domain/models/activity';
import type { ActivityDraft } from '@/application/activities/activityService';
import type { AppSettings } from '@/domain/models/settings';
import type { ActivityFormValues } from '@/features/activities/schemas/activityFormSchema';
import { toLocalDate } from '@/shared/utils/dates';

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function commonDraft(values: ActivityFormValues) {
  const notes = optionalText(values.notes);

  return {
    date: values.date,
    durationMinutes: values.durationMinutes,
    intensity: values.intensity,
    ...(values.time ? { time: values.time } : {}),
    ...(notes !== undefined ? { notes } : {}),
    ...(values.manualCaloriesKcal !== undefined
      ? { manualCaloriesKcal: values.manualCaloriesKcal }
      : {}),
  };
}

export function toActivityDraft(values: ActivityFormValues): ActivityDraft {
  const common = commonDraft(values);
  const intervalDetails = optionalText(values.intervalDetails);

  if (values.activityType === 'running') {
    if (values.distanceKm === undefined || values.averageCadenceSpm === undefined) {
      throw new Error('La distance et la cadence sont obligatoires pour une course.');
    }
    return {
      ...common,
      type: 'running',
      sessionType: values.runningSessionType,
      distanceKm: values.distanceKm,
      averageCadenceSpm: values.averageCadenceSpm,
      terrainType: values.terrainType,
      ...(values.elevationGainMeters === undefined ? {} : { elevationGainMeters: values.elevationGainMeters }),
      ...(intervalDetails === undefined ? {} : { intervalDetails }),
    };
  }

  if (values.activityType === 'swimming') {
    if (values.distanceMeters === undefined) {
      throw new Error('La distance est obligatoire pour une séance de natation.');
    }
    return {
      ...common,
      type: 'swimming',
      sessionType: values.swimmingSessionType,
      mainStroke: values.mainStroke,
      distanceMeters: values.distanceMeters,
      ...(values.poolLengthMeters === undefined ? {} : { poolLengthMeters: values.poolLengthMeters as 25 | 50 }),
      ...(intervalDetails === undefined ? {} : { intervalDetails }),
    };
  }

  if (values.met === undefined) {
    throw new Error('La valeur MET est obligatoire pour cette activité.');
  }

  if (values.activityType === 'strengthTraining') {
    return { ...common, type: 'strengthTraining', met: values.met };
  }

  if (values.activityType === 'cycling') {
    if (values.distanceKm === undefined) {
      throw new Error('La distance est obligatoire pour une sortie vélo.');
    }
    return {
      ...common,
      type: 'cycling',
      met: values.met,
      includedInDailySteps: false,
      distanceKm: values.distanceKm,
      bikeType: values.bikeType,
      environment: values.cyclingEnvironment,
      ...(values.elevationGainMeters === undefined ? {} : { elevationGainMeters: values.elevationGainMeters }),
      ...(intervalDetails === undefined ? {} : { intervalDetails }),
    };
  }

  return {
    ...common,
    type: values.activityType,
    met: values.met,
    includedInDailySteps: values.activityType === 'walking' ? values.includedInDailySteps : false,
  };
}

export function defaultActivityFormValues(type: ActivityType, settings: AppSettings): ActivityFormValues {
  const metByType: Partial<Record<ActivityType, number>> = {
    strengthTraining: settings.strengthTrainingMet,
    cycling: settings.defaultCyclingMet,
    walking: settings.defaultWalkingMet,
    otherCardio: settings.defaultOtherCardioMet,
  };

  return {
    activityType: type,
    date: toLocalDate(),
    time: '',
    durationMinutes: 45,
    intensity: 'moderate',
    notes: '',
    intervalDetails: '',
    manualCaloriesKcal: undefined,
    runningSessionType: 'easy',
    distanceKm: type === 'running' ? 7 : type === 'cycling' ? 20 : undefined,
    averageCadenceSpm: type === 'running' ? 170 : undefined,
    elevationGainMeters: undefined,
    terrainType: 'road',
    swimmingSessionType: 'endurance',
    mainStroke: 'freestyle',
    distanceMeters: type === 'swimming' ? 1_000 : undefined,
    poolLengthMeters: type === 'swimming' ? 25 : undefined,
    bikeType: 'road',
    cyclingEnvironment: 'outdoor',
    met: metByType[type],
    includedInDailySteps: type === 'walking',
  };
}

export function activityToFormValues(activity: Activity): ActivityFormValues {
  const base: ActivityFormValues = {
    activityType: activity.type,
    date: activity.date,
    time: activity.time ?? '',
    durationMinutes: activity.durationMinutes,
    intensity: activity.intensity,
    notes: activity.notes ?? '',
    intervalDetails: '',
    manualCaloriesKcal: activity.manualCaloriesKcal,
    runningSessionType: 'easy',
    distanceKm: undefined,
    averageCadenceSpm: undefined,
    elevationGainMeters: undefined,
    terrainType: 'road',
    swimmingSessionType: 'endurance',
    mainStroke: 'freestyle',
    distanceMeters: undefined,
    poolLengthMeters: undefined,
    bikeType: 'road',
    cyclingEnvironment: 'outdoor',
    met: undefined,
    includedInDailySteps: false,
  };

  if (activity.type === 'running') {
    const running = activity as RunningActivity;
    return {
      ...base,
      activityType: 'running',
      runningSessionType: running.sessionType,
      distanceKm: running.distanceKm,
      averageCadenceSpm: running.averageCadenceSpm,
      elevationGainMeters: running.elevationGainMeters,
      terrainType: running.terrainType ?? 'road',
      intervalDetails: running.intervalDetails ?? '',
    };
  }

  if (activity.type === 'swimming') {
    const swimming = activity as SwimmingActivity;
    return {
      ...base,
      activityType: 'swimming',
      swimmingSessionType: swimming.sessionType,
      mainStroke: swimming.mainStroke,
      distanceMeters: swimming.distanceMeters,
      poolLengthMeters: swimming.poolLengthMeters,
      intervalDetails: swimming.intervalDetails ?? '',
    };
  }

  if (activity.type === 'cycling') {
    const cycling = activity as CyclingActivity;
    return {
      ...base,
      activityType: 'cycling',
      distanceKm: cycling.distanceKm,
      elevationGainMeters: cycling.elevationGainMeters,
      bikeType: cycling.bikeType ?? 'road',
      cyclingEnvironment: cycling.environment ?? 'outdoor',
      intervalDetails: cycling.intervalDetails ?? '',
      met: cycling.met,
    };
  }

  if (activity.type === 'strengthTraining') {
    return { ...base, activityType: 'strengthTraining', met: (activity as StrengthTrainingActivity).met };
  }

  const other = activity as OtherActivity;
  return {
    ...base,
    activityType: other.type,
    met: other.met,
    includedInDailySteps: other.includedInDailySteps,
  };
}

export function activityToDraft(activity: Activity): ActivityDraft {
  return toActivityDraft(activityToFormValues(activity));
}


export function enduranceTemplateToFormValues(
  template: EnduranceTemplate,
  settings: AppSettings,
): ActivityFormValues {
  const values = defaultActivityFormValues(template.activityType, settings);
  return {
    ...values,
    activityType: template.activityType,
    durationMinutes: template.durationMinutes,
    intensity: template.intensity,
    notes: template.notes ?? '',
    intervalDetails: template.intervalDetails ?? '',
    runningSessionType: template.runningSessionType ?? values.runningSessionType,
    swimmingSessionType: template.swimmingSessionType ?? values.swimmingSessionType,
    mainStroke: template.mainStroke ?? values.mainStroke,
    distanceKm: template.distanceKm,
    distanceMeters: template.distanceMeters,
    averageCadenceSpm: template.averageCadenceSpm,
    elevationGainMeters: template.elevationGainMeters,
    terrainType: template.terrainType ?? values.terrainType,
    poolLengthMeters: template.poolLengthMeters,
    bikeType: template.bikeType ?? values.bikeType,
    cyclingEnvironment: template.cyclingEnvironment ?? values.cyclingEnvironment,
    met: template.activityType === 'cycling' ? (template.cyclingMet ?? settings.defaultCyclingMet) : values.met,
  };
}
