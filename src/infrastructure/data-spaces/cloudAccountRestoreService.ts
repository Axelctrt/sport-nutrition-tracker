import Dexie from 'dexie';

import type { DataSpaceDescriptor } from '@/domain/data-spaces/dataSpace';
import type { DeletionRecord } from '@/domain/models/deletion';
import type { FavoriteMeal, FoodProduct } from '@/domain/models/food';
import type { WeightEntry } from '@/domain/models/weight';
import type { Activity } from '@/domain/models/activity';
import type { Goal } from '@/domain/goals/goalState';
import {
  activateAccountDataSpace,
  type DataSpaceStorage,
} from '@/infrastructure/data-spaces/dataSpaceRegistry';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { accountDatabaseNameForFingerprint } from '@/infrastructure/database/databaseNames';
import type { DatabaseUserTableName } from '@/infrastructure/database/schema';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  belongsToCurrentUser,
  localIdFromCloud,
  stableValue,
  stripCloudFields,
  type CloudOwned,
} from '@/infrastructure/sync-prototype/cloudSyncValue';
import {
  synchronizeRealActivities,
} from '@/infrastructure/sync-prototype/realActivitySyncService';
import {
  synchronizeRealGoals,
} from '@/infrastructure/sync-prototype/realGoalSyncService';
import type {
  NutritionJournalDayAggregate,
} from '@/infrastructure/sync-prototype/realNutritionJournalSyncService';
import {
  synchronizeRealNutritionJournal,
} from '@/infrastructure/sync-prototype/realNutritionJournalSyncService';
import type {
  NutritionRecipeAggregate,
} from '@/infrastructure/sync-prototype/realNutritionLibrarySyncService';
import {
  synchronizeRealNutritionLibrary,
} from '@/infrastructure/sync-prototype/realNutritionLibrarySyncService';
import type {
  NutritionTrackingAggregate,
} from '@/infrastructure/sync-prototype/realNutritionTrackingSyncService';
import {
  synchronizeRealNutritionTracking,
} from '@/infrastructure/sync-prototype/realNutritionTrackingSyncService';
import type {
  StrengthExerciseAggregate,
  WorkoutSessionAggregate,
  WorkoutTemplateAggregate,
} from '@/infrastructure/sync-prototype/realStrengthSyncService';
import {
  synchronizeRealStrength,
} from '@/infrastructure/sync-prototype/realStrengthSyncService';
import {
  synchronizeRealWeights,
} from '@/infrastructure/sync-prototype/realWeightSyncService';

export type CloudAccountRestoreCategory =
  | 'weights'
  | 'activities'
  | 'goals'
  | 'strength'
  | 'nutritionLibrary'
  | 'nutritionJournal'
  | 'nutritionTracking';

export interface CloudAccountRestoreCategoryPreview {
  readonly key: CloudAccountRestoreCategory;
  readonly label: string;
  readonly description: string;
  readonly recordCount: number;
}

export interface CloudAccountRestorePreview {
  readonly hasCloudData: boolean;
  readonly cloudRecordCount: number;
  readonly cloudDeletionMarkerCount: number;
  readonly localMeaningfulRecordCount: number;
  readonly localState: 'missing' | 'empty' | 'non-empty';
  readonly canRestore: boolean;
  readonly categories: readonly CloudAccountRestoreCategoryPreview[];
}

export interface PreparedCloudAccountRestore {
  readonly accountFingerprint: string;
  readonly targetDatabaseName: string;
  readonly sourceFingerprint: string;
  readonly targetFingerprint: string;
  readonly targetDatabaseExisted: boolean;
  readonly analyzedAt: string;
  readonly preview: CloudAccountRestorePreview;
}

export interface CloudAccountRestoreResult {
  readonly restoredRecords: number;
  readonly restoredDeletionMarkers: number;
  readonly sourcePreserved: true;
  readonly space: DataSpaceDescriptor;
  readonly completedAt: string;
}

export interface CloudAccountRestoreSourceSnapshot {
  readonly weights: readonly WeightEntry[];
  readonly weightMarkers: readonly DeletionRecord[];
  readonly activities: readonly Activity[];
  readonly activityMarkers: readonly DeletionRecord[];
  readonly goals: readonly Goal[];
  readonly goalMarkers: readonly DeletionRecord[];
  readonly strengthExercises: readonly StrengthExerciseAggregate[];
  readonly workoutTemplates: readonly WorkoutTemplateAggregate[];
  readonly workoutSessions: readonly WorkoutSessionAggregate[];
  readonly strengthMarkers: readonly DeletionRecord[];
  readonly nutritionJournalDays: readonly NutritionJournalDayAggregate[];
  readonly nutritionJournalMarkers: readonly DeletionRecord[];
  readonly nutritionProducts: readonly FoodProduct[];
  readonly nutritionRecipes: readonly NutritionRecipeAggregate[];
  readonly favoriteMeals: readonly FavoriteMeal[];
  readonly nutritionLibraryMarkers: readonly DeletionRecord[];
  readonly nutritionTracking: readonly NutritionTrackingAggregate[];
}

export interface CloudAccountRestoreRuntime {
  syncCloud(): Promise<void>;
  readSourceSnapshot(): Promise<CloudAccountRestoreSourceSnapshot>;
  restoreTo(database: AppDatabase): Promise<void>;
}

export interface CloudAccountRestoreServiceOptions {
  readonly storage?: DataSpaceStorage;
  readonly targetDatabase?: AppDatabase;
  readonly now?: Date | string;
  readonly stageDatabaseName?: string;
}

type RestoreTableName = Extract<
  DatabaseUserTableName,
  | 'weights'
  | 'activities'
  | 'goals'
  | 'exerciseDefinitions'
  | 'workoutTemplates'
  | 'workoutTemplateExercises'
  | 'workoutSessions'
  | 'workoutSessionExercises'
  | 'strengthSets'
  | 'foodProducts'
  | 'meals'
  | 'foodEntries'
  | 'favoriteMeals'
  | 'recipes'
  | 'recipeIngredients'
  | 'dailyTargets'
  | 'dailyJournalStatuses'
  | 'weeklyReviews'
  | 'acceptedCalorieAdjustments'
  | 'deletionRecords'
>;

type RestoreSnapshot = Record<RestoreTableName, unknown[]>;

const RESTORE_TABLE_NAMES: readonly RestoreTableName[] = [
  'weights',
  'activities',
  'goals',
  'exerciseDefinitions',
  'workoutTemplates',
  'workoutTemplateExercises',
  'workoutSessions',
  'workoutSessionExercises',
  'strengthSets',
  'foodProducts',
  'meals',
  'foodEntries',
  'favoriteMeals',
  'recipes',
  'recipeIngredients',
  'dailyTargets',
  'dailyJournalStatuses',
  'weeklyReviews',
  'acceptedCalorieAdjustments',
  'deletionRecords',
];

const SYNCED_DELETION_TYPES = new Set([
  'weight',
  'activity',
  'goal',
  'strengthSet',
  'workoutSessionExercise',
  'meal',
  'foodEntry',
  'favoriteMeal',
  'recipe',
  'recipeIngredient',
]);

function normalizeFingerprint(value: string): string {
  return value.trim().toLowerCase();
}

function isoNow(now: Date | string | undefined): string {
  if (typeof now === 'string') return now;
  return (now ?? new Date()).toISOString();
}

function rowId(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  return String((value as { id?: unknown }).id ?? '');
}

function sortRows<T>(values: readonly T[]): T[] {
  return [...values].sort((left, right) => rowId(left).localeCompare(rowId(right)));
}

function fingerprint(value: unknown): string {
  const text = stableValue(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function sourceFingerprint(snapshot: CloudAccountRestoreSourceSnapshot): string {
  return fingerprint(
    Object.fromEntries(
      Object.entries(snapshot).map(([key, rows]) => [key, sortRows(rows)]),
    ),
  );
}

function isPlainOpenFoodFactsCache(product: FoodProduct): boolean {
  return (
    product.source.type === 'openFoodFacts' &&
    !product.isFavorite &&
    (product.localOverrides?.length ?? 0) === 0
  );
}

function isSyncedMarker(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const entityType = (value as { entityType?: unknown }).entityType;
  return typeof entityType === 'string' && SYNCED_DELETION_TYPES.has(entityType);
}

async function readRestoreSnapshot(database: AppDatabase): Promise<RestoreSnapshot> {
  const snapshot = {} as RestoreSnapshot;
  for (const tableName of RESTORE_TABLE_NAMES) {
    snapshot[tableName] = await database.table(tableName).toArray();
  }
  return snapshot;
}

function meaningfulTargetSnapshot(snapshot: RestoreSnapshot): Record<string, unknown[]> {
  const customExercises = snapshot.exerciseDefinitions.filter((value) => (
    value && typeof value === 'object' &&
    (value as { source?: unknown }).source === 'user'
  ));
  const meaningfulProducts = snapshot.foodProducts.filter((value) =>
    !isPlainOpenFoodFactsCache(value as FoodProduct),
  );
  const syncedMarkers = snapshot.deletionRecords.filter(isSyncedMarker);

  return {
    weights: snapshot.weights,
    activities: snapshot.activities,
    goals: snapshot.goals,
    exerciseDefinitions: customExercises,
    workoutTemplates: snapshot.workoutTemplates,
    workoutTemplateExercises: snapshot.workoutTemplateExercises,
    workoutSessions: snapshot.workoutSessions,
    workoutSessionExercises: snapshot.workoutSessionExercises,
    strengthSets: snapshot.strengthSets,
    foodProducts: meaningfulProducts,
    meals: snapshot.meals,
    foodEntries: snapshot.foodEntries,
    favoriteMeals: snapshot.favoriteMeals,
    recipes: snapshot.recipes,
    recipeIngredients: snapshot.recipeIngredients,
    dailyJournalStatuses: snapshot.dailyJournalStatuses,
    weeklyReviews: snapshot.weeklyReviews,
    acceptedCalorieAdjustments: snapshot.acceptedCalorieAdjustments,
    deletionRecords: syncedMarkers,
  };
}

function meaningfulRecordCount(snapshot: RestoreSnapshot): number {
  return Object.values(meaningfulTargetSnapshot(snapshot)).reduce(
    (total, rows) => total + rows.length,
    0,
  );
}

function targetFingerprint(snapshot: RestoreSnapshot): string {
  return fingerprint(
    Object.fromEntries(
      Object.entries(meaningfulTargetSnapshot(snapshot)).map(([key, rows]) => [
        key,
        sortRows(rows),
      ]),
    ),
  );
}

async function resolveTargetState(
  accountFingerprint: string,
  options: CloudAccountRestoreServiceOptions,
): Promise<{
  readonly databaseName: string;
  readonly existed: boolean;
  readonly snapshot?: RestoreSnapshot;
  readonly fingerprint: string;
  readonly meaningfulRecords: number;
}> {
  const databaseName = accountDatabaseNameForFingerprint(accountFingerprint);
  const provided = options.targetDatabase;

  if (provided && provided.name !== databaseName) {
    throw new Error('La base locale fournie ne correspond pas au compte connecté.');
  }

  const existed = provided ? true : await Dexie.exists(databaseName);
  if (!existed) {
    return {
      databaseName,
      existed: false,
      fingerprint: 'missing',
      meaningfulRecords: 0,
    };
  }

  const database = provided ?? new AppDatabase(databaseName);
  const closeAfterRead = !provided;
  try {
    if (!database.isOpen()) await database.open();
    const snapshot = await readRestoreSnapshot(database);
    return {
      databaseName,
      existed: true,
      snapshot,
      fingerprint: targetFingerprint(snapshot),
      meaningfulRecords: meaningfulRecordCount(snapshot),
    };
  } finally {
    if (closeAfterRead) database.close();
  }
}

function buildPreview(
  source: CloudAccountRestoreSourceSnapshot,
  target: Awaited<ReturnType<typeof resolveTargetState>>,
): CloudAccountRestorePreview {
  const strengthCount =
    source.strengthExercises.length +
    source.workoutTemplates.length +
    source.workoutSessions.length;
  const nutritionLibraryCount =
    source.nutritionProducts.length +
    source.nutritionRecipes.length +
    source.favoriteMeals.length;
  const nutritionJournalCount = source.nutritionJournalDays.reduce(
    (total, day) =>
      total + day.meals.length + day.entries.length +
      (day.target ? 1 : 0) + (day.status ? 1 : 0),
    0,
  );
  const nutritionTrackingCount = source.nutritionTracking.reduce(
    (total, aggregate) => total + 1 + aggregate.adjustments.length,
    0,
  );
  const categories: CloudAccountRestoreCategoryPreview[] = [
    {
      key: 'weights',
      label: 'Pesées',
      description: 'Historique des pesées synchronisées.',
      recordCount: source.weights.length,
    },
    {
      key: 'activities',
      label: 'Activités',
      description: 'Activités sportives synchronisées.',
      recordCount: source.activities.length,
    },
    {
      key: 'goals',
      label: 'Objectifs',
      description: 'Objectifs sportifs synchronisés.',
      recordCount: source.goals.length,
    },
    {
      key: 'strength',
      label: 'Musculation',
      description: 'Exercices personnels, modèles et séances.',
      recordCount: strengthCount,
    },
    {
      key: 'nutritionLibrary',
      label: 'Bibliothèque nutritionnelle',
      description: 'Produits, recettes et repas favoris.',
      recordCount: nutritionLibraryCount,
    },
    {
      key: 'nutritionJournal',
      label: 'Journal nutritionnel',
      description: 'Repas, entrées, objectifs quotidiens et validations.',
      recordCount: nutritionJournalCount,
    },
    {
      key: 'nutritionTracking',
      label: 'Suivi nutritionnel',
      description: 'Bilans hebdomadaires et ajustements acceptés.',
      recordCount: nutritionTrackingCount,
    },
  ];
  const cloudRecordCount = categories.reduce(
    (total, category) => total + category.recordCount,
    0,
  );
  const cloudDeletionMarkerCount =
    source.weightMarkers.length +
    source.activityMarkers.length +
    source.goalMarkers.length +
    source.strengthMarkers.length +
    source.nutritionJournalMarkers.length +
    source.nutritionLibraryMarkers.length;
  const localState = !target.existed
    ? 'missing'
    : target.meaningfulRecords === 0
      ? 'empty'
      : 'non-empty';

  return {
    hasCloudData: cloudRecordCount > 0,
    cloudRecordCount,
    cloudDeletionMarkerCount,
    localMeaningfulRecordCount: target.meaningfulRecords,
    localState,
    canRestore: cloudRecordCount > 0 && target.meaningfulRecords === 0,
    categories,
  };
}

function normalizeOwnedRows<T extends { readonly id: string }>(
  rows: readonly CloudOwned<T>[],
  currentUserId: string,
): T[] {
  return rows
    .filter((row) => belongsToCurrentUser(row, currentUserId))
    .map((row) => {
      const id = localIdFromCloud(row.id);
      if (!id) return undefined;
      return { ...stripCloudFields(row), id } as T;
    })
    .filter((row): row is T => row !== undefined)
    .sort((left, right) => left.id.localeCompare(right.id));
}

export async function readCloudAccountRestoreSourceSnapshot(
  database: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<CloudAccountRestoreSourceSnapshot> {
  const [
    weights,
    weightMarkers,
    activities,
    activityMarkers,
    goals,
    goalMarkers,
    strengthExercises,
    workoutTemplates,
    workoutSessions,
    strengthMarkers,
    nutritionJournalDays,
    nutritionJournalMarkers,
    nutritionProducts,
    nutritionRecipes,
    favoriteMeals,
    nutritionLibraryMarkers,
    nutritionTracking,
  ] = await Promise.all([
    database.realWeights.toArray(),
    database.realWeightDeletionRecords.toArray(),
    database.realActivities.toArray(),
    database.realActivityDeletionRecords.toArray(),
    database.realGoals.toArray(),
    database.realGoalDeletionRecords.toArray(),
    database.realStrengthExercises.toArray(),
    database.realWorkoutTemplates.toArray(),
    database.realWorkoutSessions.toArray(),
    database.realStrengthDeletionRecords.toArray(),
    database.realNutritionJournalDays.toArray(),
    database.realNutritionJournalDeletionRecords.toArray(),
    database.realNutritionProducts.toArray(),
    database.realNutritionRecipes.toArray(),
    database.realFavoriteMeals.toArray(),
    database.realNutritionLibraryDeletionRecords.toArray(),
    database.realNutritionTracking.toArray(),
  ]);

  return {
    weights: normalizeOwnedRows(weights, currentUserId),
    weightMarkers: normalizeOwnedRows(weightMarkers, currentUserId),
    activities: normalizeOwnedRows(activities, currentUserId),
    activityMarkers: normalizeOwnedRows(activityMarkers, currentUserId),
    goals: normalizeOwnedRows(goals, currentUserId),
    goalMarkers: normalizeOwnedRows(goalMarkers, currentUserId),
    strengthExercises: normalizeOwnedRows(strengthExercises, currentUserId),
    workoutTemplates: normalizeOwnedRows(workoutTemplates, currentUserId),
    workoutSessions: normalizeOwnedRows(workoutSessions, currentUserId),
    strengthMarkers: normalizeOwnedRows(strengthMarkers, currentUserId),
    nutritionJournalDays: normalizeOwnedRows(nutritionJournalDays, currentUserId),
    nutritionJournalMarkers: normalizeOwnedRows(
      nutritionJournalMarkers,
      currentUserId,
    ),
    nutritionProducts: normalizeOwnedRows(nutritionProducts, currentUserId),
    nutritionRecipes: normalizeOwnedRows(nutritionRecipes, currentUserId),
    favoriteMeals: normalizeOwnedRows(favoriteMeals, currentUserId),
    nutritionLibraryMarkers: normalizeOwnedRows(
      nutritionLibraryMarkers,
      currentUserId,
    ),
    nutritionTracking: normalizeOwnedRows(nutritionTracking, currentUserId),
  };
}

export async function restoreCloudAccountDataToDatabase(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<void> {
  const options = { writeCloud: false } as const;
  await synchronizeRealNutritionLibrary(
    localDatabase,
    cloudDatabase,
    currentUserId,
    options,
  );
  await synchronizeRealNutritionJournal(
    localDatabase,
    cloudDatabase,
    currentUserId,
    options,
  );
  await synchronizeRealWeights(
    localDatabase,
    cloudDatabase,
    currentUserId,
    options,
  );
  await synchronizeRealActivities(
    localDatabase,
    cloudDatabase,
    currentUserId,
    options,
  );
  await synchronizeRealGoals(
    localDatabase,
    cloudDatabase,
    currentUserId,
    options,
  );
  await synchronizeRealStrength(
    localDatabase,
    cloudDatabase,
    currentUserId,
    options,
  );
  await synchronizeRealNutritionTracking(
    localDatabase,
    cloudDatabase,
    currentUserId,
    options,
  );
}

export function createCloudAccountRestoreRuntime(
  database: SyncPrototypeDatabase,
  currentUserId: string,
): CloudAccountRestoreRuntime {
  return {
    syncCloud: async () => database.cloud.sync(),
    readSourceSnapshot: () =>
      readCloudAccountRestoreSourceSnapshot(database, currentUserId),
    restoreTo: (targetDatabase) =>
      restoreCloudAccountDataToDatabase(
        targetDatabase,
        database,
        currentUserId,
      ),
  };
}

export async function prepareCloudAccountRestore(
  accountFingerprint: string,
  runtime: CloudAccountRestoreRuntime,
  options: CloudAccountRestoreServiceOptions = {},
): Promise<PreparedCloudAccountRestore> {
  const normalized = normalizeFingerprint(accountFingerprint);
  await runtime.syncCloud();
  const [source, target] = await Promise.all([
    runtime.readSourceSnapshot(),
    resolveTargetState(normalized, options),
  ]);

  return {
    accountFingerprint: normalized,
    targetDatabaseName: target.databaseName,
    sourceFingerprint: sourceFingerprint(source),
    targetFingerprint: target.fingerprint,
    targetDatabaseExisted: target.existed,
    analyzedAt: isoNow(options.now),
    preview: buildPreview(source, target),
  };
}

function mergeById<T>(preserved: readonly T[], restored: readonly T[]): T[] {
  return [
    ...new Map(
      [...preserved, ...restored].map((value) => [rowId(value), value]),
    ).values(),
  ];
}

function buildFinalRestoreSnapshot(
  target: RestoreSnapshot,
  stage: RestoreSnapshot,
): RestoreSnapshot {
  const builtInExercises = target.exerciseDefinitions.filter((value) => (
    value && typeof value === 'object' &&
    (value as { source?: unknown }).source !== 'user'
  ));
  const cachedProducts = target.foodProducts.filter((value) =>
    isPlainOpenFoodFactsCache(value as FoodProduct),
  );
  const unsyncedMarkers = target.deletionRecords.filter(
    (value) => !isSyncedMarker(value),
  );

  return {
    ...stage,
    exerciseDefinitions: mergeById(
      builtInExercises,
      stage.exerciseDefinitions,
    ),
    foodProducts: mergeById(cachedProducts, stage.foodProducts),
    deletionRecords: mergeById(unsyncedMarkers, stage.deletionRecords),
  };
}

async function writeExactRestoreSnapshot(
  database: AppDatabase,
  snapshot: RestoreSnapshot,
): Promise<void> {
  const tables = RESTORE_TABLE_NAMES.map((tableName) => database.table(tableName));
  await database.transaction('rw', tables, async () => {
    for (const tableName of RESTORE_TABLE_NAMES) {
      const table = database.table(tableName);
      await table.clear();
      const rows = snapshot[tableName];
      if (rows.length > 0) await table.bulkPut(rows);
    }
  });
}

function restoredRecordCount(snapshot: RestoreSnapshot): number {
  return RESTORE_TABLE_NAMES.reduce(
    (total, tableName) => total + snapshot[tableName].length,
    0,
  );
}

export async function applyPreparedCloudAccountRestore(
  prepared: PreparedCloudAccountRestore,
  runtime: CloudAccountRestoreRuntime,
  options: CloudAccountRestoreServiceOptions = {},
): Promise<CloudAccountRestoreResult> {
  const normalized = normalizeFingerprint(prepared.accountFingerprint);
  const expectedDatabaseName = accountDatabaseNameForFingerprint(normalized);
  if (prepared.targetDatabaseName !== expectedDatabaseName) {
    throw new Error('L’analyse cloud ne correspond pas à l’espace local demandé.');
  }

  await runtime.syncCloud();
  const source = await runtime.readSourceSnapshot();
  if (sourceFingerprint(source) !== prepared.sourceFingerprint) {
    throw new Error(
      'Les données cloud ont changé depuis l’analyse. Relance l’analyse avant de restaurer.',
    );
  }

  const currentTarget = await resolveTargetState(normalized, options);
  if (currentTarget.fingerprint !== prepared.targetFingerprint) {
    throw new Error(
      'L’espace local a changé depuis l’analyse. Relance l’analyse avant de restaurer.',
    );
  }
  if (currentTarget.meaningfulRecords > 0) {
    throw new Error(
      'Cet espace contient déjà des données locales. Utilise les synchronisations par rubrique au lieu d’une restauration initiale.',
    );
  }
  if (!prepared.preview.hasCloudData) {
    throw new Error('Aucune donnée cloud restaurable n’a été trouvée pour ce compte.');
  }

  const stageDatabaseName =
    options.stageDatabaseName ?? `${expectedDatabaseName}--cloud-restore-stage`;
  await Dexie.delete(stageDatabaseName);
  const stageDatabase = new AppDatabase(stageDatabaseName);
  const targetDatabase = options.targetDatabase ?? new AppDatabase(expectedDatabaseName);
  const ownsTargetConnection = !options.targetDatabase;
  let beforeSnapshot: RestoreSnapshot | undefined;
  let targetWasWritten = false;
  let targetCreatedByRestore = false;

  try {
    await stageDatabase.open();
    await runtime.restoreTo(stageDatabase);
    const stageSnapshot = await readRestoreSnapshot(stageDatabase);

    await runtime.syncCloud();
    const sourceAfterStaging = await runtime.readSourceSnapshot();
    if (sourceFingerprint(sourceAfterStaging) !== prepared.sourceFingerprint) {
      throw new Error(
        'Les données cloud ont changé pendant la préparation. Relance l’analyse avant de restaurer.',
      );
    }

    const targetBeforeCommit = await resolveTargetState(normalized, options);
    if (targetBeforeCommit.fingerprint !== prepared.targetFingerprint) {
      throw new Error(
        'L’espace local a changé pendant la préparation. Relance l’analyse avant de restaurer.',
      );
    }

    if (!targetDatabase.isOpen()) {
      const existedImmediatelyBeforeOpen = await Dexie.exists(expectedDatabaseName);
      if (!targetBeforeCommit.existed && existedImmediatelyBeforeOpen) {
        throw new Error(
          'L’espace local a changé pendant la préparation. Relance l’analyse avant de restaurer.',
        );
      }
      await targetDatabase.open();
      targetCreatedByRestore = !existedImmediatelyBeforeOpen;
    }

    beforeSnapshot = await readRestoreSnapshot(targetDatabase);
    const fingerprintBeforeWrite = targetCreatedByRestore
      ? 'missing'
      : targetFingerprint(beforeSnapshot);
    if (fingerprintBeforeWrite !== prepared.targetFingerprint) {
      throw new Error(
        'L’espace local a changé pendant la préparation. Relance l’analyse avant de restaurer.',
      );
    }
    if (meaningfulRecordCount(beforeSnapshot) > 0) {
      throw new Error(
        'Cet espace contient déjà des données locales. Utilise les synchronisations par rubrique au lieu d’une restauration initiale.',
      );
    }

    const finalSnapshot = buildFinalRestoreSnapshot(beforeSnapshot, stageSnapshot);
    await writeExactRestoreSnapshot(targetDatabase, finalSnapshot);
    targetWasWritten = true;

    const space = activateAccountDataSpace(
      normalized,
      options.storage,
      options.now,
    );
    return {
      restoredRecords: restoredRecordCount(stageSnapshot),
      restoredDeletionMarkers: stageSnapshot.deletionRecords.length,
      sourcePreserved: true,
      space,
      completedAt: isoNow(options.now),
    };
  } catch (error) {
    if (targetWasWritten && beforeSnapshot) {
      try {
        await writeExactRestoreSnapshot(targetDatabase, beforeSnapshot);
      } catch {
        // La première erreur reste prioritaire. Le contrôle manuel et l’audit
        // signaleront toute anomalie résiduelle de la base locale.
      }
    }
    if (targetCreatedByRestore) {
      targetDatabase.close();
      await Dexie.delete(expectedDatabaseName);
    }
    throw error;
  } finally {
    stageDatabase.close();
    await Dexie.delete(stageDatabaseName);
    if (ownsTargetConnection) targetDatabase.close();
  }
}
