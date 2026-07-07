import {
  hasCardioSocialActivityField,
  hasCommonSocialActivityField,
  isPublishableSocialActivityPolicy,
  type SocialActivityProjectionIdentity,
} from '@/application/friends/socialActivityProjectionSupport';
import { getEffectiveActivityCalories } from '@/domain/calculations/activityCalories';
import { calculateAverageSpeedKmh } from '@/domain/calculations/endurance';
import { calculateRunningPaceSecondsPerKm } from '@/domain/calculations/running';
import { calculateSwimmingPaceSecondsPer100Meters } from '@/domain/calculations/swimming';
import { createActiveSocialActivitySnapshotV2 } from '@/domain/friends/socialActivitySnapshotFactory';
import type {
  ActiveSocialActivitySnapshot,
  SocialActivitySnapshotSummary,
  SocialCardioActivitySnapshotDetail,
} from '@/domain/friends/socialActivitySnapshotContract';
import type { Activity } from '@/domain/models/activity';

export interface StoredActivitySocialProjectionInput extends SocialActivityProjectionIdentity {
  readonly activity: Activity;
  readonly title?: string;
}

function activitySummary(
  activity: Exclude<Activity, { type: 'strengthTraining' }>,
  policy: StoredActivitySocialProjectionInput['policy'],
): SocialActivitySnapshotSummary {
  const summary: Record<string, number | string> = {};

  if (hasCommonSocialActivityField(policy, 'duration')) {
    summary.durationMinutes = activity.durationMinutes;
  }
  if (hasCommonSocialActivityField(policy, 'intensity')) summary.intensity = activity.intensity;
  if (hasCommonSocialActivityField(policy, 'calories')) {
    summary.caloriesKcal = getEffectiveActivityCalories(activity);
  }

  if (hasCardioSocialActivityField(policy, 'distance')) {
    if (activity.type === 'running') summary.distanceKm = activity.distanceKm;
    if (activity.type === 'swimming') summary.distanceMeters = activity.distanceMeters;
    if (activity.type === 'cycling' && activity.distanceKm !== undefined) {
      summary.distanceKm = activity.distanceKm;
    }
  }

  if (hasCardioSocialActivityField(policy, 'pace')) {
    if (activity.type === 'running' && activity.distanceKm > 0) {
      summary.paceMinutesPerKm = calculateRunningPaceSecondsPerKm(
        activity.durationMinutes,
        activity.distanceKm,
      ) / 60;
    }
    if (activity.type === 'swimming' && activity.distanceMeters > 0) {
      summary.paceSecondsPer100Meters = calculateSwimmingPaceSecondsPer100Meters(
        activity.durationMinutes,
        activity.distanceMeters,
      );
    }
  }

  if (
    hasCardioSocialActivityField(policy, 'speed')
    && activity.type === 'cycling'
    && activity.distanceKm !== undefined
  ) {
    summary.speedKph = calculateAverageSpeedKmh(activity.durationMinutes, activity.distanceKm);
  }

  if (
    hasCardioSocialActivityField(policy, 'elevation')
    && (activity.type === 'running' || activity.type === 'cycling')
    && activity.elevationGainMeters !== undefined
  ) {
    summary.elevationGainMeters = activity.elevationGainMeters;
  }

  if (hasCardioSocialActivityField(policy, 'cadence') && activity.type === 'running') {
    summary.averageCadencePerMinute = activity.averageCadenceSpm;
  }

  return summary as SocialActivitySnapshotSummary;
}

function activityDetail(
  activity: Exclude<Activity, { type: 'strengthTraining' }>,
  policy: StoredActivitySocialProjectionInput['policy'],
): SocialCardioActivitySnapshotDetail {
  const detail: SocialCardioActivitySnapshotDetail = { family: 'cardio' };

  if (
    hasCardioSocialActivityField(policy, 'sessionType')
    && (activity.type === 'running' || activity.type === 'swimming')
  ) {
    return {
      ...detail,
      sessionType: activity.sessionType,
      ...(activity.type === 'running'
        && hasCardioSocialActivityField(policy, 'terrain')
        && activity.terrainType
        ? { terrainType: activity.terrainType }
        : {}),
      ...(activity.type === 'swimming' && hasCardioSocialActivityField(policy, 'stroke')
        ? { mainStroke: activity.mainStroke }
        : {}),
      ...(activity.type === 'swimming'
        && hasCardioSocialActivityField(policy, 'poolLength')
        && activity.poolLengthMeters !== undefined
        ? { poolLengthMeters: activity.poolLengthMeters }
        : {}),
    };
  }

  if (activity.type === 'running') {
    return {
      ...detail,
      ...(hasCardioSocialActivityField(policy, 'terrain') && activity.terrainType
        ? { terrainType: activity.terrainType }
        : {}),
    };
  }

  if (activity.type === 'swimming') {
    return {
      ...detail,
      ...(hasCardioSocialActivityField(policy, 'stroke')
        ? { mainStroke: activity.mainStroke }
        : {}),
      ...(hasCardioSocialActivityField(policy, 'poolLength')
        && activity.poolLengthMeters !== undefined
        ? { poolLengthMeters: activity.poolLengthMeters }
        : {}),
    };
  }

  if (activity.type === 'cycling') {
    return {
      ...detail,
      ...(hasCardioSocialActivityField(policy, 'bikeType') && activity.bikeType
        ? { bikeType: activity.bikeType }
        : {}),
      ...(hasCardioSocialActivityField(policy, 'environment') && activity.environment
        ? { environment: activity.environment }
        : {}),
    };
  }

  return detail;
}

export function projectStoredActivityToSocialSnapshotV2(
  input: StoredActivitySocialProjectionInput,
): ActiveSocialActivitySnapshot | undefined {
  if (!isPublishableSocialActivityPolicy(input.policy)) return undefined;
  if (input.activity.type === 'strengthTraining') {
    throw new Error(
      'Une activité strengthTraining ne peut pas produire un snapshot détaillé : utilise la séance de musculation terminée.',
    );
  }

  return createActiveSocialActivitySnapshotV2({
    ownerUserId: input.ownerUserId,
    recipientUserId: input.recipientUserId,
    sourceKind: 'activity',
    sourceActivityId: input.activity.id,
    sourceRevision: input.activity.updatedAt,
    visibility: input.policy.visibility,
    family: 'cardio',
    activityType: input.activity.type,
    ...(input.title && hasCommonSocialActivityField(input.policy, 'title')
      ? { title: input.title }
      : {}),
    occurredOn: input.activity.date,
    ...(input.activity.time && hasCommonSocialActivityField(input.policy, 'time')
      ? { occurredTime: input.activity.time }
      : {}),
    allowedFields: input.policy.fields,
    summary: activitySummary(input.activity, input.policy),
    ...(input.policy.visibility === 'summary'
      ? {}
      : { detail: activityDetail(input.activity, input.policy) }),
    createdAt: input.activity.createdAt,
    updatedAt: input.activity.updatedAt,
  });
}
