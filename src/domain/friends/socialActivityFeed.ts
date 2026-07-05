import {
  evaluateFriendScopedActivitySharingGuard,
  normalizeFriendHandle,
  type FriendProfileSummary,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import type {
  SocialActivityDetailedMetrics,
  SocialActivitySnapshot,
  SocialActivitySnapshotScope,
} from '@/domain/friends/socialActivitySnapshot';
import type { ActivityIntensity, ActivityType } from '@/domain/models/activity';
import type { EntityId, LocalDate } from '@/domain/models/common';

export type SocialActivityFeedStatus =
  | 'sharingDisabled'
  | 'noFriends'
  | 'empty'
  | 'ready';

export interface SocialActivityFeedItem {
  readonly id: EntityId;
  readonly friendId: EntityId;
  readonly friendHandle: string;
  readonly friendDisplayName: string;
  readonly friendInitials: string;
  readonly scope: SocialActivitySnapshotScope;
  readonly permissionLimited: boolean;
  readonly activityType: ActivityType;
  readonly activityLabel: string;
  readonly date: LocalDate;
  readonly durationMinutes: number;
  readonly intensity: ActivityIntensity;
  readonly intensityLabel: string;
  readonly estimatedCaloriesKcal: number;
  readonly metricLabels: readonly string[];
  readonly detailLabels: readonly string[];
  readonly guardReason: string;
}

export interface SocialActivityFeedState {
  readonly status: SocialActivityFeedStatus;
  readonly message: string;
  readonly items: readonly SocialActivityFeedItem[];
  readonly hiddenSnapshotCount: number;
  readonly rawActivityShared: false;
}

const activityLabels: Record<ActivityType, string> = {
  running: 'Course',
  swimming: 'Natation',
  strengthTraining: 'Musculation',
  cycling: 'Vélo',
  walking: 'Marche',
  otherCardio: 'Cardio',
};

const intensityLabels: Record<ActivityIntensity, string> = {
  low: 'Faible',
  moderate: 'Modérée',
  high: 'Élevée',
};

function findSnapshotFriend(
  privacySnapshot: FriendsPrivacySnapshot,
  snapshot: SocialActivitySnapshot,
): FriendProfileSummary | undefined {
  const normalizedHandle = normalizeFriendHandle(snapshot.friendHandle);

  return privacySnapshot.friends.find((friend) => (
    friend.id === snapshot.friendId
    || friend.userId === snapshot.friendId
    || normalizeFriendHandle(friend.handle) === normalizedHandle
  ));
}

function buildSummaryMetricLabels(snapshot: SocialActivitySnapshot): readonly string[] {
  const labels: string[] = [];
  if (snapshot.metrics.distanceKm !== undefined) labels.push(`${snapshot.metrics.distanceKm} km`);
  if (snapshot.metrics.distanceMeters !== undefined) labels.push(`${snapshot.metrics.distanceMeters} m`);
  if (snapshot.metrics.elevationGainMeters !== undefined) labels.push(`D+ ${snapshot.metrics.elevationGainMeters} m`);
  return labels;
}

function buildDetailLabels(
  snapshot: SocialActivitySnapshot,
  effectiveScope: SocialActivitySnapshotScope,
): readonly string[] {
  if (effectiveScope !== 'detailed') return [];

  const metrics = snapshot.metrics as SocialActivityDetailedMetrics;
  return [
    metrics.sessionType,
    metrics.terrainType,
    metrics.mainStroke,
    metrics.poolLengthMeters === undefined ? undefined : `Bassin ${metrics.poolLengthMeters} m`,
    metrics.bikeType,
    metrics.environment,
  ].filter((label): label is string => Boolean(label));
}

function toFeedItem(
  privacySnapshot: FriendsPrivacySnapshot,
  snapshot: SocialActivitySnapshot,
): SocialActivityFeedItem | undefined {
  const friend = findSnapshotFriend(privacySnapshot, snapshot);
  if (!friend) return undefined;

  const guard = evaluateFriendScopedActivitySharingGuard(privacySnapshot, friend);
  if (!guard.canShareSummary) return undefined;

  const effectiveScope: SocialActivitySnapshotScope = snapshot.scope === 'detailed' && guard.canShareDetailed
    ? 'detailed'
    : 'summary';

  return {
    id: snapshot.id,
    friendId: friend.userId ?? friend.id,
    friendHandle: normalizeFriendHandle(friend.handle),
    friendDisplayName: friend.displayName,
    friendInitials: friend.initials,
    scope: effectiveScope,
    permissionLimited: snapshot.scope === 'detailed' && effectiveScope === 'summary',
    activityType: snapshot.activityType,
    activityLabel: activityLabels[snapshot.activityType],
    date: snapshot.date,
    durationMinutes: snapshot.durationMinutes,
    intensity: snapshot.intensity,
    intensityLabel: intensityLabels[snapshot.intensity],
    estimatedCaloriesKcal: snapshot.estimatedCaloriesKcal,
    metricLabels: buildSummaryMetricLabels(snapshot),
    detailLabels: buildDetailLabels(snapshot, effectiveScope),
    guardReason: guard.reason,
  };
}

export function buildSocialActivityFeed(
  privacySnapshot: FriendsPrivacySnapshot,
  snapshots: readonly SocialActivitySnapshot[],
): SocialActivityFeedState {
  if (privacySnapshot.privacy.profileVisibility === 'private' || privacySnapshot.privacy.activitySharing === 'disabled') {
    return {
      status: 'sharingDisabled',
      message: 'Partage d’activité désactivé : aucun snapshot n’est affiché.',
      items: [],
      hiddenSnapshotCount: snapshots.length,
      rawActivityShared: false,
    };
  }

  if (privacySnapshot.friends.length === 0) {
    return {
      status: 'noFriends',
      message: 'Aucun ami accepté : le fil reste vide.',
      items: [],
      hiddenSnapshotCount: snapshots.length,
      rawActivityShared: false,
    };
  }

  const items = snapshots
    .map((snapshot) => toFeedItem(privacySnapshot, snapshot))
    .filter((item): item is SocialActivityFeedItem => Boolean(item));

  if (items.length === 0) {
    return {
      status: 'empty',
      message: 'Aucune activité partagée par tes amis pour le moment.',
      items: [],
      hiddenSnapshotCount: snapshots.length,
      rawActivityShared: false,
    };
  }

  return {
    status: 'ready',
    message: 'Fil d’activité amis alimenté par des snapshots filtrés uniquement.',
    items,
    hiddenSnapshotCount: snapshots.length - items.length,
    rawActivityShared: false,
  };
}
