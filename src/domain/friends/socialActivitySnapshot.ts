import type {
  Activity,
  ActivityIntensity,
  ActivityType,
} from '@/domain/models/activity';
import type { EntityId, IsoDateTime, LocalDate } from '@/domain/models/common';
import { getEffectiveActivityCalories } from '@/domain/calculations/activityCalories';
import {
  evaluateFriendScopedActivitySharingGuard,
  normalizeFriendHandle,
  type FriendActivityShareScope,
  type FriendProfileSummary,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';

export type SocialActivitySnapshotScope = Extract<FriendActivityShareScope, 'summary' | 'detailed'>;
export type SocialActivitySnapshotStatus = 'created' | 'blocked';

export interface SocialActivitySummaryMetrics {
  readonly distanceKm?: number;
  readonly distanceMeters?: number;
  readonly elevationGainMeters?: number;
}

export interface SocialActivityDetailedMetrics extends SocialActivitySummaryMetrics {
  readonly sessionType?: string;
  readonly terrainType?: string;
  readonly mainStroke?: string;
  readonly poolLengthMeters?: number;
  readonly bikeType?: string;
  readonly environment?: string;
}

export interface SocialActivitySnapshotBase {
  readonly id: EntityId;
  readonly sourceActivityId: EntityId;
  readonly friendId: EntityId;
  readonly friendHandle: string;
  readonly scope: SocialActivitySnapshotScope;
  readonly activityType: ActivityType;
  readonly date: LocalDate;
  readonly durationMinutes: number;
  readonly intensity: ActivityIntensity;
  readonly estimatedCaloriesKcal: number;
  readonly createdAt: IsoDateTime;
  readonly guardReason: string;
}

export interface SocialActivitySummarySnapshot extends SocialActivitySnapshotBase {
  readonly scope: 'summary';
  readonly metrics: SocialActivitySummaryMetrics;
}

export interface SocialActivityDetailedSnapshot extends SocialActivitySnapshotBase {
  readonly scope: 'detailed';
  readonly metrics: SocialActivityDetailedMetrics;
}

export type SocialActivitySnapshot = SocialActivitySummarySnapshot | SocialActivityDetailedSnapshot;

export interface SocialActivitySnapshotCreatedResult {
  readonly status: 'created';
  readonly requestedScope: SocialActivitySnapshotScope;
  readonly snapshot: SocialActivitySnapshot;
  readonly downgradedToSummary: boolean;
}

export interface SocialActivitySnapshotBlockedResult {
  readonly status: 'blocked';
  readonly requestedScope: SocialActivitySnapshotScope;
  readonly friendId: EntityId;
  readonly friendHandle: string;
  readonly allowedScope: FriendActivityShareScope;
  readonly reason: string;
}

export type SocialActivitySnapshotResult =
  | SocialActivitySnapshotCreatedResult
  | SocialActivitySnapshotBlockedResult;

export interface CreateSocialActivitySnapshotInput {
  readonly activity: Activity;
  readonly privacySnapshot: FriendsPrivacySnapshot;
  readonly friend: FriendProfileSummary;
  readonly requestedScope?: SocialActivitySnapshotScope;
  readonly now?: IsoDateTime;
}

function roundMetric(value: number, fractionDigits = 1): number {
  return Number(value.toFixed(fractionDigits));
}

function createSnapshotId(
  activity: Activity,
  friend: FriendProfileSummary,
  scope: SocialActivitySnapshotScope,
): EntityId {
  const friendStableId = friend.userId ?? friend.id;
  return `social-activity-snapshot:${activity.id}:${friendStableId}:${scope}` as EntityId;
}

function createSummaryMetrics(activity: Activity): SocialActivitySummaryMetrics {
  if (activity.type === 'running') {
    return {
      distanceKm: roundMetric(activity.distanceKm),
      ...(activity.elevationGainMeters === undefined
        ? {}
        : { elevationGainMeters: Math.round(activity.elevationGainMeters) }),
    };
  }

  if (activity.type === 'swimming') {
    return {
      distanceMeters: Math.round(activity.distanceMeters),
    };
  }

  if (activity.type === 'cycling') {
    return {
      ...(activity.distanceKm === undefined ? {} : { distanceKm: roundMetric(activity.distanceKm) }),
      ...(activity.elevationGainMeters === undefined
        ? {}
        : { elevationGainMeters: Math.round(activity.elevationGainMeters) }),
    };
  }

  return {};
}

function createDetailedMetrics(activity: Activity): SocialActivityDetailedMetrics {
  const summary = createSummaryMetrics(activity);

  if (activity.type === 'running') {
    return {
      ...summary,
      sessionType: activity.sessionType,
      ...(activity.terrainType === undefined ? {} : { terrainType: activity.terrainType }),
    };
  }

  if (activity.type === 'swimming') {
    return {
      ...summary,
      sessionType: activity.sessionType,
      mainStroke: activity.mainStroke,
      ...(activity.poolLengthMeters === undefined ? {} : { poolLengthMeters: activity.poolLengthMeters }),
    };
  }

  if (activity.type === 'cycling') {
    return {
      ...summary,
      ...(activity.bikeType === undefined ? {} : { bikeType: activity.bikeType }),
      ...(activity.environment === undefined ? {} : { environment: activity.environment }),
    };
  }

  return summary;
}

function toBaseSnapshot(
  activity: Activity,
  friend: FriendProfileSummary,
  scope: SocialActivitySnapshotScope,
  now: IsoDateTime,
  guardReason: string,
): SocialActivitySnapshotBase {
  return {
    id: createSnapshotId(activity, friend, scope),
    sourceActivityId: activity.id,
    friendId: friend.userId ?? friend.id,
    friendHandle: normalizeFriendHandle(friend.handle),
    scope,
    activityType: activity.type,
    date: activity.date,
    durationMinutes: activity.durationMinutes,
    intensity: activity.intensity,
    estimatedCaloriesKcal: Math.round(getEffectiveActivityCalories(activity)),
    createdAt: now,
    guardReason,
  };
}

function toSummarySnapshot(
  activity: Activity,
  friend: FriendProfileSummary,
  now: IsoDateTime,
  guardReason: string,
): SocialActivitySummarySnapshot {
  return {
    ...toBaseSnapshot(activity, friend, 'summary', now, guardReason),
    scope: 'summary',
    metrics: createSummaryMetrics(activity),
  };
}

function toDetailedSnapshot(
  activity: Activity,
  friend: FriendProfileSummary,
  now: IsoDateTime,
  guardReason: string,
): SocialActivityDetailedSnapshot {
  return {
    ...toBaseSnapshot(activity, friend, 'detailed', now, guardReason),
    scope: 'detailed',
    metrics: createDetailedMetrics(activity),
  };
}

export function createSocialActivitySnapshotForFriend({
  activity,
  privacySnapshot,
  friend,
  requestedScope = 'detailed',
  now = new Date().toISOString(),
}: CreateSocialActivitySnapshotInput): SocialActivitySnapshotResult {
  const guard = evaluateFriendScopedActivitySharingGuard(privacySnapshot, friend);

  if (!guard.canShareSummary) {
    return {
      status: 'blocked',
      requestedScope,
      friendId: friend.userId ?? friend.id,
      friendHandle: normalizeFriendHandle(friend.handle),
      allowedScope: guard.allowedScope,
      reason: guard.reason,
    };
  }

  const scope: SocialActivitySnapshotScope = requestedScope === 'detailed' && guard.canShareDetailed
    ? 'detailed'
    : 'summary';
  const snapshot = scope === 'detailed'
    ? toDetailedSnapshot(activity, friend, now, guard.reason)
    : toSummarySnapshot(activity, friend, now, guard.reason);

  return {
    status: 'created',
    requestedScope,
    snapshot,
    downgradedToSummary: requestedScope === 'detailed' && scope === 'summary',
  };
}

export function createSocialActivitySnapshotsForFriends(
  activity: Activity,
  privacySnapshot: FriendsPrivacySnapshot,
  requestedScope: SocialActivitySnapshotScope = 'detailed',
  now: IsoDateTime = new Date().toISOString(),
): readonly SocialActivitySnapshotResult[] {
  return privacySnapshot.friends.map((friend) =>
    createSocialActivitySnapshotForFriend({
      activity,
      privacySnapshot,
      friend,
      requestedScope,
      now,
    }),
  );
}
