import type {
  Activity,
  ActivityType,
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
    };
  }

  if (values.met === undefined) {
    throw new Error('La valeur MET est obligatoire pour cette activité.');
  }

  if (values.activityType === 'strengthTraining') {
    return {
      ...common,
      type: 'strengthTraining',
      met: values.met,
    };
  }

  return {
    ...common,
    type: values.activityType,
    met: values.met,
    includedInDailySteps: values.activityType === 'walking'
      ? values.includedInDailySteps
      : false,
  };
}

export function defaultActivityFormValues(
  type: ActivityType,
  settings: AppSettings,
): ActivityFormValues {
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
    manualCaloriesKcal: undefined,
    runningSessionType: 'easy',
    distanceKm: type === 'running' ? 7 : undefined,
    averageCadenceSpm: type === 'running' ? 170 : undefined,
    swimmingSessionType: 'endurance',
    mainStroke: 'freestyle',
    distanceMeters: type === 'swimming' ? 1_000 : undefined,
    met: metByType[type],
    includedInDailySteps: type === 'walking',
  };
}

export function activityToFormValues(activity: Activity): ActivityFormValues {
  const base = {
    activityType: activity.type,
    date: activity.date,
    time: activity.time ?? '',
    durationMinutes: activity.durationMinutes,
    intensity: activity.intensity,
    notes: activity.notes ?? '',
    manualCaloriesKcal: activity.manualCaloriesKcal,
    runningSessionType: 'easy' as const,
    distanceKm: undefined,
    averageCadenceSpm: undefined,
    swimmingSessionType: 'endurance' as const,
    mainStroke: 'freestyle' as const,
    distanceMeters: undefined,
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
    };
  }

  if (activity.type === 'strengthTraining') {
    return {
      ...base,
      activityType: 'strengthTraining',
      met: (activity as StrengthTrainingActivity).met,
    };
  }

  const other = activity as OtherActivity;
  return {
    ...base,
    activityType: other.type,
    met: other.met,
    includedInDailySteps: other.includedInDailySteps,
  };
}
