import type { ActivityIntensity, ActivityType } from '@/domain/models/activity';
import type { EntityId, IsoDateTime, LocalDate } from '@/domain/models/common';
import type {
  LoadUnit,
  MuscleGroup,
  StrengthSetType,
  StrengthTrackingMode,
} from '@/domain/models/strength';
import {
  type SocialActivityFieldSelection,
  type SocialActivityFamily,
  type SocialActivityVisibility,
} from '@/domain/friends/socialActivitySharingPolicy';

export const SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION = '0.29.0-a2' as const;

export type SocialActivitySnapshotSourceKind = 'activity' | 'strengthSession';
export type SocialActivitySnapshotState = 'active' | 'deleted';
export type SocialActivitySnapshotActiveVisibility = Exclude<SocialActivityVisibility, 'private'>;
export type SocialActivitySnapshotDeletionReason = 'sourceDeleted' | 'sharingDisabled' | 'friendRevoked';

export interface SocialActivityPacePoint {
  readonly elapsedSeconds: number;
  readonly paceMinutesPerKm: number;
}

export interface SocialActivityChartPoint {
  readonly elapsedSeconds: number;
  readonly value: number;
}

export interface SocialActivityIntervalSnapshot {
  readonly label: string;
  readonly durationSeconds?: number;
  readonly distanceMeters?: number;
  readonly paceMinutesPerKm?: number;
  readonly speedKph?: number;
}

export interface SocialActivityLapSnapshot {
  readonly lapNumber: number;
  readonly durationSeconds?: number;
  readonly distanceMeters?: number;
  readonly paceMinutesPerKm?: number;
  readonly speedKph?: number;
}

export interface SocialActivitySegmentSnapshot {
  readonly label: string;
  readonly durationSeconds?: number;
  readonly distanceMeters?: number;
  readonly paceMinutesPerKm?: number;
  readonly speedKph?: number;
  readonly elevationGainMeters?: number;
}

export interface SocialActivitySnapshotSummary {
  readonly durationMinutes?: number;
  readonly intensity?: ActivityIntensity;
  readonly caloriesKcal?: number;
  readonly distanceKm?: number;
  readonly distanceMeters?: number;
  readonly paceMinutesPerKm?: number;
  readonly speedKph?: number;
  readonly elevationGainMeters?: number;
  readonly averageHeartRateBpm?: number;
  readonly averageCadencePerMinute?: number;
  readonly exerciseCount?: number;
  readonly muscleGroups?: readonly MuscleGroup[];
  readonly volumeKg?: number;
}

export interface SocialCardioActivitySnapshotDetail {
  readonly family: 'cardio';
  readonly sessionType?: string;
  readonly terrainType?: string;
  readonly mainStroke?: string;
  readonly poolLengthMeters?: number;
  readonly bikeType?: string;
  readonly environment?: string;
  readonly paceSeries?: readonly SocialActivityPacePoint[];
  readonly intervals?: readonly SocialActivityIntervalSnapshot[];
  readonly laps?: readonly SocialActivityLapSnapshot[];
  readonly segments?: readonly SocialActivitySegmentSnapshot[];
  readonly chart?: {
    readonly metric: 'pace' | 'speed' | 'heartRate' | 'cadence';
    readonly points: readonly SocialActivityChartPoint[];
  };
}

export interface SocialStrengthSetSnapshot {
  readonly setNumber: number;
  readonly type?: StrengthSetType;
  readonly repetitions?: number;
  readonly loadKg?: number;
  readonly loadUnit?: LoadUnit;
  readonly durationSeconds?: number;
  readonly distanceMeters?: number;
  readonly rpe?: number;
  readonly restSeconds?: number;
}

export interface SocialStrengthExerciseSnapshot {
  readonly name: string;
  readonly muscleGroups?: readonly MuscleGroup[];
  readonly trackingMode?: StrengthTrackingMode;
  readonly sets?: readonly SocialStrengthSetSnapshot[];
}

export interface SocialStrengthActivitySnapshotDetail {
  readonly family: 'strength';
  readonly sessionName?: string;
  readonly exercises?: readonly SocialStrengthExerciseSnapshot[];
}

export interface SocialGenericActivitySnapshotDetail {
  readonly family: 'generic';
}

export type SocialActivitySnapshotDetail =
  | SocialCardioActivitySnapshotDetail
  | SocialStrengthActivitySnapshotDetail
  | SocialGenericActivitySnapshotDetail;

export interface SocialActivitySnapshotIdentity {
  readonly contractVersion: typeof SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION;
  readonly snapshotId: EntityId;
  readonly ownerUserId: EntityId;
  readonly recipientUserId: EntityId;
  readonly sourceKind: SocialActivitySnapshotSourceKind;
  readonly sourceActivityId: EntityId;
  readonly sourceRevision: string;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface ActiveSocialActivitySnapshot extends SocialActivitySnapshotIdentity {
  readonly state: 'active';
  readonly visibility: SocialActivitySnapshotActiveVisibility;
  readonly family: SocialActivityFamily;
  readonly activityType: ActivityType;
  readonly title?: string;
  readonly occurredOn: LocalDate;
  readonly occurredAt?: IsoDateTime;
  readonly allowedFields: SocialActivityFieldSelection;
  readonly summary: SocialActivitySnapshotSummary;
  readonly detail?: SocialActivitySnapshotDetail;
}

export interface DeletedSocialActivitySnapshot extends SocialActivitySnapshotIdentity {
  readonly state: 'deleted';
  readonly deletedAt: IsoDateTime;
  readonly deletionReason: SocialActivitySnapshotDeletionReason;
}

export type SocialActivitySnapshotV2 =
  | ActiveSocialActivitySnapshot
  | DeletedSocialActivitySnapshot;

export interface SocialActivitySnapshotValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface SocialActivitySnapshotValidationResult {
  readonly valid: boolean;
  readonly issues: readonly SocialActivitySnapshotValidationIssue[];
}

export interface CreateActiveSocialActivitySnapshotInput {
  readonly ownerUserId: EntityId;
  readonly recipientUserId: EntityId;
  readonly sourceKind: SocialActivitySnapshotSourceKind;
  readonly sourceActivityId: EntityId;
  readonly sourceRevision: string;
  readonly visibility: SocialActivitySnapshotActiveVisibility;
  readonly family: SocialActivityFamily;
  readonly activityType: ActivityType;
  readonly title?: string;
  readonly occurredOn: LocalDate;
  readonly occurredAt?: IsoDateTime;
  readonly allowedFields: SocialActivityFieldSelection;
  readonly summary: SocialActivitySnapshotSummary;
  readonly detail?: SocialActivitySnapshotDetail;
  readonly createdAt?: IsoDateTime;
  readonly updatedAt?: IsoDateTime;
}

export interface CreateDeletedSocialActivitySnapshotInput {
  readonly ownerUserId: EntityId;
  readonly recipientUserId: EntityId;
  readonly sourceKind: SocialActivitySnapshotSourceKind;
  readonly sourceActivityId: EntityId;
  readonly sourceRevision: string;
  readonly deletionReason: SocialActivitySnapshotDeletionReason;
  readonly createdAt: IsoDateTime;
  readonly deletedAt?: IsoDateTime;
}

function encodeSnapshotIdPart(value: string): string {
  return encodeURIComponent(value);
}

export function createSocialActivitySnapshotV2Id(input: {
  readonly ownerUserId: EntityId;
  readonly recipientUserId: EntityId;
  readonly sourceKind: SocialActivitySnapshotSourceKind;
  readonly sourceActivityId: EntityId;
}): EntityId {
  return [
    'social-activity-snapshot-v2',
    encodeSnapshotIdPart(input.ownerUserId),
    input.sourceKind,
    encodeSnapshotIdPart(input.sourceActivityId),
    encodeSnapshotIdPart(input.recipientUserId),
  ].join(':');
}
