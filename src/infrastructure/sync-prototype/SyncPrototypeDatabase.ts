import Dexie, { type Table } from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import type { Activity } from '@/domain/models/activity';
import type { Goal } from '@/domain/goals/goalState';
import type { DeletionRecord } from '@/domain/models/deletion';
import type { EntityId } from '@/domain/models/common';
import type { WeightEntry } from '@/domain/models/weight';
import type {
  NutritionJournalDayAggregate,
} from '@/infrastructure/sync-prototype/realNutritionJournalSyncService';
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
import type {
  EnabledSyncPrototypeConfig,
  SyncPrototypeConfig,
} from '@/infrastructure/sync-prototype/syncPrototypeConfig';

export const LEGACY_SYNC_PROTOTYPE_DATABASE_NAME = 'sportpilot-sync-prototype';
export const SYNC_PROTOTYPE_DATABASE_VERSION = 8;
export const SYNC_PROTOTYPE_DATABASE_NAME =
  `sportpilot-sync-runtime-0.20.0-v${SYNC_PROTOTYPE_DATABASE_VERSION}`;
export const SYNC_PROTOTYPE_TABLE_NAMES = [
  'weights',
  'deletionRecords',
  'realWeights',
  'realWeightDeletionRecords',
  'realActivities',
  'realActivityDeletionRecords',
  'realGoals',
  'realGoalDeletionRecords',
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
] as const;

export class SyncPrototypeDatabase extends Dexie {
  declare weights: Table<WeightEntry, EntityId>;
  declare deletionRecords: Table<DeletionRecord, EntityId>;
  declare realWeights: Table<WeightEntry, EntityId>;
  declare realWeightDeletionRecords: Table<DeletionRecord, EntityId>;
  declare realActivities: Table<Activity, EntityId>;
  declare realActivityDeletionRecords: Table<DeletionRecord, EntityId>;
  declare realGoals: Table<Goal, EntityId>;
  declare realGoalDeletionRecords: Table<DeletionRecord, EntityId>;
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

    this.version(SYNC_PROTOTYPE_DATABASE_VERSION).stores({
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
    });

    this.cloud.configure({
      databaseUrl,
      requireAuth: false,
      customLoginGui: true,
      tryUseServiceWorker: false,
      nameSuffix: true,
      socialAuth: false,
      disableEagerSync: true,
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
