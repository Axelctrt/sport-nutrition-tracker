import Dexie, { type Table } from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import type { Activity } from '@/domain/models/activity';
import type { PlannedEnduranceSession } from '@/domain/planning/endurancePlanningState';
import type { Goal } from '@/domain/goals/goalState';
import type { DeletionRecord } from '@/domain/models/deletion';
import type { EntityId } from '@/domain/models/common';
import type { WeightEntry } from '@/domain/models/weight';
import type {
  NutritionJournalDayAggregate,
} from '@/infrastructure/sync-prototype/realNutritionJournalSyncService';
import type { DailyCoachingDayAggregate } from '@/infrastructure/sync-prototype/realDailyCoachingSyncService';
import type {
  NutritionRecipeAggregate,
} from '@/infrastructure/sync-prototype/realNutritionLibrarySyncService';
import type { FavoriteMeal, FoodProduct } from '@/domain/models/food';
import type {
  NutritionTrackingAggregate,
} from '@/infrastructure/sync-prototype/realNutritionTrackingSyncService';
import type {
  StrengthExerciseAggregate,
  WorkoutSessionAggregate,
  WorkoutTemplateAggregate,
} from '@/infrastructure/sync-prototype/realStrengthSyncService';
import type { AccountPreferencesAggregate } from '@/infrastructure/sync-prototype/realAccountPreferencesSyncService';
import type { RewardsRoutinesAggregate } from '@/infrastructure/sync-prototype/realRewardsRoutinesSyncService';
import type {
  EnabledSyncPrototypeConfig,
  SyncPrototypeConfig,
} from '@/infrastructure/sync-prototype/syncPrototypeConfig';
import type {
  SocialCloudIdentityRecord,
  SocialHandleReservation,
} from '@/domain/friends/socialCloudIdentity';
import type { CloudFriendRequest, CloudFriendship } from '@/domain/friends/socialIdentity';
import type { CloudFriendActivityPermissionRecord } from '@/domain/friends/socialCloudFriendship';
import type { CloudSocialActivitySnapshotRecord } from '@/domain/friends/socialCloudActivitySnapshot';
import type { LogicalSyncBaseline } from '@/infrastructure/sync-prototype/logicalSyncState';
import type {
  RealGoalMutationClockState,
  RealGoalMutationHead,
  RealGoalMutationRecord,
} from '@/infrastructure/sync-prototype/realGoalMutationJournal';

export const LEGACY_SYNC_PROTOTYPE_DATABASE_NAME = 'sportpilot-sync-prototype';
export const SYNC_PROTOTYPE_DATABASE_VERSION = 18;
export const SYNC_PROTOTYPE_DATABASE_NAME =
  'sportpilot-sync-runtime-0.20.0-v16';
export const SYNC_PROTOTYPE_TABLE_NAMES = [
  'weights',
  'deletionRecords',
  'realWeights',
  'realWeightDeletionRecords',
  'realActivities',
  'realEndurancePlanningSessions',
  'realActivityDeletionRecords',
  'realGoals',
  'realGoalDeletionRecords',
  'realGoalMutations',
  'realGoalMutationHeads',
  'realGoalMutationClocks',
  'realStrengthExercises',
  'realWorkoutTemplates',
  'realWorkoutSessions',
  'realStrengthDeletionRecords',
  'realNutritionJournalDays',
  'realNutritionJournalDeletionRecords',
  'realNutritionProducts',
  'realNutritionRecipes',
  'realFavoriteMeals',
  'realNutritionLibraryDeletionRecords',
  'realNutritionTracking',
  'realAccountPreferences',
  'realRewardsRoutines',
  'realDailyCoachingDays',
  'socialIdentities',
  'socialHandleReservations',
  'socialFriendRequests',
  'socialFriendships',
  'socialFriendPermissions',
  'socialActivitySnapshots',
  'realSyncBaselines',
] as const;

export class SyncPrototypeDatabase extends Dexie {
  declare weights: Table<WeightEntry, EntityId>;
  declare deletionRecords: Table<DeletionRecord, EntityId>;
  declare realWeights: Table<WeightEntry, EntityId>;
  declare realWeightDeletionRecords: Table<DeletionRecord, EntityId>;
  declare realActivities: Table<Activity, EntityId>;
  declare realEndurancePlanningSessions: Table<PlannedEnduranceSession, EntityId>;
  declare realActivityDeletionRecords: Table<DeletionRecord, EntityId>;
  declare realGoals: Table<Goal, EntityId>;
  declare realGoalDeletionRecords: Table<DeletionRecord, EntityId>;
  declare realGoalMutations: Table<RealGoalMutationRecord, string>;
  declare realGoalMutationHeads: Table<RealGoalMutationHead, string>;
  declare realGoalMutationClocks: Table<RealGoalMutationClockState, string>;
  declare realStrengthExercises: Table<StrengthExerciseAggregate, EntityId>;
  declare realWorkoutTemplates: Table<WorkoutTemplateAggregate, EntityId>;
  declare realWorkoutSessions: Table<WorkoutSessionAggregate, EntityId>;
  declare realStrengthDeletionRecords: Table<DeletionRecord, EntityId>;
  declare realNutritionJournalDays: Table<NutritionJournalDayAggregate, EntityId>;
  declare realNutritionJournalDeletionRecords: Table<DeletionRecord, EntityId>;
  declare realNutritionProducts: Table<FoodProduct, EntityId>;
  declare realNutritionRecipes: Table<NutritionRecipeAggregate, EntityId>;
  declare realFavoriteMeals: Table<FavoriteMeal, EntityId>;
  declare realNutritionLibraryDeletionRecords: Table<DeletionRecord, EntityId>;
  declare realNutritionTracking: Table<NutritionTrackingAggregate, EntityId>;
  declare realAccountPreferences: Table<AccountPreferencesAggregate, EntityId>;
  declare realRewardsRoutines: Table<RewardsRoutinesAggregate, EntityId>;
  declare realDailyCoachingDays: Table<DailyCoachingDayAggregate, EntityId>;
  declare socialIdentities: Table<SocialCloudIdentityRecord, EntityId>;
  declare socialHandleReservations: Table<SocialHandleReservation, EntityId>;
  declare socialFriendRequests: Table<CloudFriendRequest, EntityId | string>;
  declare socialFriendships: Table<CloudFriendship, EntityId | string>;
  declare socialFriendPermissions: Table<CloudFriendActivityPermissionRecord, EntityId | string>;
  declare socialActivitySnapshots: Table<CloudSocialActivitySnapshotRecord, EntityId | string>;
  declare realSyncBaselines: Table<LogicalSyncBaseline, string>;

  constructor(
    { databaseUrl }: EnabledSyncPrototypeConfig,
    databaseName: string = SYNC_PROTOTYPE_DATABASE_NAME,
  ) {
    super(databaseName, { addons: [dexieCloud] });

    this.version(1).stores({
      weights: 'id, &date, updatedAt',
      deletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
    });

    this.version(2).stores({
      weights: 'id, &date, updatedAt',
      deletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realWeights: 'id, date, updatedAt',
      realWeightDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
    });

    this.version(3).stores({
      weights: 'id, &date, updatedAt',
      deletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realWeights: 'id, date, updatedAt',
      realWeightDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realActivities: 'id, date, type, [date+type], updatedAt',
      realActivityDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
    });

    this.version(4).stores({
      weights: 'id, &date, updatedAt',
      deletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realWeights: 'id, date, updatedAt',
      realWeightDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realActivities: 'id, date, type, [date+type], updatedAt',
      realActivityDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realGoals: 'id, metric, status, startDate, deadline, updatedAt',
      realGoalDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
    });

    this.version(16).stores({
      weights: 'id, &date, updatedAt',
      deletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realWeights: 'id, date, updatedAt',
      realWeightDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realActivities: 'id, date, type, [date+type], updatedAt',
      realEndurancePlanningSessions:
        'id, date, activityType, status, updatedAt',
      realActivityDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realGoals: 'id, metric, status, startDate, deadline, updatedAt',
      realGoalDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realStrengthExercises: 'id, updatedAt',
      realWorkoutTemplates: 'id, updatedAt',
      realWorkoutSessions: 'id, updatedAt',
      realStrengthDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realNutritionJournalDays: 'id, date, updatedAt',
      realNutritionJournalDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realNutritionProducts: 'id, barcode, updatedAt',
      realNutritionRecipes: 'id, updatedAt',
      realFavoriteMeals: 'id, updatedAt',
      realNutritionLibraryDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realNutritionTracking: 'id, updatedAt',
      realAccountPreferences: 'id, updatedAt',
      realRewardsRoutines: 'id, updatedAt',
      realDailyCoachingDays: 'id, date, updatedAt',
      socialIdentities: 'id, &userId, &handle, updatedAt',
      socialHandleReservations: 'id, &handle, ownerUserId, updatedAt',
      socialFriendRequests: 'id, requesterUserId, recipientUserId, status, requestedAt, updatedAt, [recipientUserId+status], [requesterUserId+status]',
      socialFriendships: 'id, userAId, userBId, status, updatedAt, [userAId+status], [userBId+status]',
      socialFriendPermissions: 'id, ownerUserId, friendUserId, sharingLevel, updatedAt, [ownerUserId+friendUserId]',
      socialActivitySnapshots: 'id, ownerUserId, publishedForUserId, sourceActivityId, activityType, date, scope, updatedAt, [publishedForUserId+date], [ownerUserId+publishedForUserId]',
      realSyncBaselines: 'id, accountUserId, domainId, entityId, updatedAt, [accountUserId+domainId]',
    });

    this.version(17).stores({
      realGoalMutations:
        'id, accountUserId, entityId, orderedAtMs, [accountUserId+entityId]',
      realGoalMutationClocks: 'id, accountUserId, actorId',
    });

    this.version(SYNC_PROTOTYPE_DATABASE_VERSION).stores({
      realGoalMutations:
        'id, accountUserId, entityId, parentMutationId, [accountUserId+entityId]',
      realGoalMutationHeads:
        'id, accountUserId, entityId, mutationId, [entityId+mutationId], [accountUserId+entityId]',
    });

    this.cloud.configure({
      databaseUrl,
      requireAuth: false,
      customLoginGui: true,
      tryUseServiceWorker: false,
      nameSuffix: true,
      socialAuth: false,
      disableEagerSync: true,
      unsyncedTables: ['realSyncBaselines', 'realGoalMutationClocks'],
    });
  }
}

export function createSyncPrototypeDatabase(
  config: SyncPrototypeConfig,
): SyncPrototypeDatabase {
  if (!config.enabled) {
    throw new Error(
      'Le prototype de synchronisation est désactivé.',
    );
  }

  return new SyncPrototypeDatabase(config);
}
